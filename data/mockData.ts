/**
 * Mock data for Moro UI shell. Replace with real API/DB later.
 */

export interface MockCelebrity {
  id: string;
  name: string;
  slug: string;
}

export type Gender = 'male' | 'female';

export interface MockUser {
  id: string;
  displayName: string;
  gender: Gender;
  age: number;
  selfieUrl: string | null;
  additionalPhotoUrls: string[];
  matchedCelebrityId: string;
  similarityPercent: number;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  bio: string | null;
  socialsVisible: boolean;
}

export const MOCK_CELEBRITIES: MockCelebrity[] = [
  { id: 'celeb-1', name: 'Leonardo DiCaprio', slug: 'leonardo-dicaprio' },
  { id: 'celeb-2', name: 'Zendaya', slug: 'zendaya' },
  { id: 'celeb-3', name: 'Timothée Chalamet', slug: 'timothee-chalamet' },
  { id: 'celeb-4', name: 'Margot Robbie', slug: 'margot-robbie' },
  { id: 'celeb-5', name: 'Ryan Gosling', slug: 'ryan-gosling' },
];

export const MOCK_USERS: MockUser[] = [
  {
    id: 'user-1',
    displayName: 'You',
    gender: 'male',
    age: 18,
    selfieUrl: null,
    additionalPhotoUrls: [],
    matchedCelebrityId: 'celeb-1',
    similarityPercent: 0,
    instagramHandle: null,
    tiktokHandle: null,
    bio: null,
    socialsVisible: true,
  },
  {
    id: 'user-2',
    displayName: 'Jordan',
    gender: 'female',
    age: 24,
    selfieUrl: null,
    additionalPhotoUrls: [],
    matchedCelebrityId: 'celeb-2',
    similarityPercent: 82,
    instagramHandle: 'jordan.gram',
    tiktokHandle: null,
    bio: null,
    socialsVisible: true,
  },
  {
    id: 'user-3',
    displayName: 'Sam',
    gender: 'male',
    age: 31,
    selfieUrl: null,
    additionalPhotoUrls: [],
    matchedCelebrityId: 'celeb-1',
    similarityPercent: 71,
    instagramHandle: null,
    tiktokHandle: 'sammyt',
    bio: 'Finding my celebrity twin.',
    socialsVisible: false,
  },
  {
    id: 'user-4',
    displayName: 'Casey',
    gender: 'female',
    age: 26,
    selfieUrl: null,
    additionalPhotoUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg', 'https://example.com/c.jpg'],
    matchedCelebrityId: 'celeb-4',
    similarityPercent: 75,
    instagramHandle: 'casey_pics',
    tiktokHandle: 'casey_pics',
    bio: 'Entertainment only ✨',
    socialsVisible: true,
  },
  {
    id: 'user-5',
    displayName: 'Riley',
    gender: 'female',
    age: 22,
    selfieUrl: null,
    additionalPhotoUrls: [],
    matchedCelebrityId: 'celeb-3',
    similarityPercent: 69,
    instagramHandle: 'rileydaily',
    tiktokHandle: null,
    bio: null,
    socialsVisible: true,
  },
];

/** Current user (mock). Used for Results → "View Profile" and Settings. */
export const MOCK_CURRENT_USER_ID = 'user-1';

export function getCelebrityById(id: string): MockCelebrity | undefined {
  return MOCK_CELEBRITIES.find((c) => c.id === id);
}

export function getCelebrityBySlug(slug: string): MockCelebrity | undefined {
  return MOCK_CELEBRITIES.find((c) => c.slug === slug);
}

export function getUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

export function getUsersByCelebrityId(celebrityId: string): MockUser[] {
  return MOCK_USERS.filter((u) => u.matchedCelebrityId === celebrityId);
}

export function formatGender(g: Gender): string {
  return g.charAt(0).toUpperCase() + g.slice(1);
}
