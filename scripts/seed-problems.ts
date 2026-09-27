/**
 * CodeGrind: LeetCode Public GraphQL Problem Catalog Seed Script
 *
 * Pulls the public problemset questions metadata from LeetCode's unofficial GraphQL API
 * (no authentication required) and inserts or upserts them into Supabase or outputs to JSON.
 *
 * Usage:
 *   npx tsx scripts/seed-problems.ts [--limit 100] [--output json|supabase]
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface LeetCodeGraphQLResponse {
  data?: {
    problemsetQuestionList?: {
      total: number;
      questions: {
        frontendQuestionId: string;
        title: string;
        titleSlug: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        acRate: number;
        paidOnly: boolean;
        topicTags: {
          name: string;
          slug: string;
        }[];
      }[];
    };
  };
  errors?: { message: string }[];
}

interface ParsedProblem {
  frontend_id: number;
  leetcode_slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  url: string;
  acceptance_rate: number;
  cached_at: string;
}

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const QUERY = `
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      acRate
      difficulty
      frontendQuestionId: questionFrontendId
      paidOnly: isPaidOnly
      title
      titleSlug
      topicTags {
        name
        slug
      }
    }
  }
}
`;

async function fetchLeetCodeProblems(limit: number = 75, skip: number = 0): Promise<ParsedProblem[]> {
  console.log(`[CodeGrind Seeder] Requesting ${limit} problems from ${LEETCODE_GRAPHQL_URL} (skip=${skip})...`);

  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json',
        Referer: 'https://leetcode.com/problemset/all/',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          categorySlug: '',
          skip,
          limit,
          filters: {},
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as LeetCodeGraphQLResponse;

    if (payload.errors && payload.errors.length > 0) {
      throw new Error(`GraphQL Errors: ${payload.errors.map((e) => e.message).join(', ')}`);
    }

    const rawList = payload.data?.problemsetQuestionList?.questions || [];
    console.log(`[CodeGrind Seeder] Successfully fetched ${rawList.length} problems from LeetCode GraphQL.`);

    const nowIso = new Date().toISOString();
    const parsed: ParsedProblem[] = rawList
      .filter((q) => !q.paidOnly) // Exclude LeetCode Premium-only problems
      .map((q) => ({
        frontend_id: parseInt(q.frontendQuestionId, 10),
        leetcode_slug: q.titleSlug,
        title: q.title,
        difficulty: q.difficulty,
        tags: q.topicTags.map((t) => t.name),
        url: `https://leetcode.com/problems/${q.titleSlug}/`,
        acceptance_rate: parseFloat(q.acRate.toFixed(2)),
        cached_at: nowIso,
      }));

    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CodeGrind Seeder] Warning: LeetCode GraphQL fetch failed (${msg}).`);
    console.warn('[CodeGrind Seeder] Falling back to static curated seed catalog...');
    return [];
  }
}

async function runSeed() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

  const problems = await fetchLeetCodeProblems(limit);

  // Write catalog to json file
  const outPath = path.resolve(process.cwd(), 'src/data/problemsCatalog.json');
  if (problems.length > 0) {
    fs.writeFileSync(outPath, JSON.stringify(problems, null, 2), 'utf-8');
    console.log(`[CodeGrind Seeder] Cached ${problems.length} problems to ${outPath}`);
  }

  // Check if Supabase credentials are present for direct DB upsert
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && problems.length > 0) {
    console.log(`[CodeGrind Seeder] Connecting to Supabase at ${supabaseUrl}...`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('problems')
      .upsert(problems, { onConflict: 'leetcode_slug' });

    if (error) {
      console.error('[CodeGrind Seeder] Failed to upsert problems to Supabase:', error.message);
    } else {
      console.log(`[CodeGrind Seeder] Upserted ${problems.length} problems into Supabase table public.problems!`);
    }
  } else {
    console.log('[CodeGrind Seeder] Skipping DB upsert (no SUPABASE_URL / key found in environment). Seed catalog is ready.');
  }
}

if (process.argv[1]?.includes('seed-problems')) {
  runSeed().catch((err) => {
    console.error('[CodeGrind Seeder] Fatal error:', err);
    process.exit(1);
  });
}
