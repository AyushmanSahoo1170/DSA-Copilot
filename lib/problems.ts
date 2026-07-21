export type Language = "c" | "python" | "java";
export type Visualization = "linked-list" | "stack" | "tree" | "graph" | "array";

export type Problem = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  description: string;
  examples: string[];
  constraints: string[];
  visualization: Visualization;
  starterCode: Record<Language, string>;
};

const cNode = `struct Node {
    int value;
    struct Node* next;
};`;

export const problems: Problem[] = [
  {
    slug: "reverse-linked-list", title: "Reverse a Linked List", difficulty: "easy", topics: ["Linked List", "Pointers"], visualization: "linked-list",
    description: "Given the head of a singly linked list, reverse the list in-place and return the new head. You may only change the links between existing nodes.",
    examples: ["Input: head = [1, 2, 3, 4, 5]", "Output: [5, 4, 3, 2, 1]"], constraints: ["The number of nodes is in the range [0, 5000].", "-5000 ≤ Node.val ≤ 5000."],
    starterCode: {
      c: `#include <stdlib.h>\n\n${cNode}\n\nstruct Node* reverse(struct Node* head) {\n    // TODO: reverse the links without allocating new nodes\n    return head;\n}`,
      python: `class Node:\n    def __init__(self, value, next=None):\n        self.value = value\n        self.next = next\n\ndef reverse(head):\n    # TODO: reverse the links without allocating new nodes\n    return head`,
      java: `class Solution {\n    static class Node {\n        int value;\n        Node next;\n    }\n\n    Node reverse(Node head) {\n        // TODO: reverse the links without allocating new nodes\n        return head;\n    }\n}`,
    },
  },
  {
    slug: "valid-parentheses", title: "Valid Parentheses", difficulty: "easy", topics: ["Stack", "String"], visualization: "stack",
    description: "Given a string containing only the characters '(', ')', '{', '}', '[' and ']', determine whether the input string is valid. Every opening bracket must close in the correct order.",
    examples: ["Input: s = \"{[]}\"", "Output: true"], constraints: ["1 ≤ s.length ≤ 10⁴.", "s contains only bracket characters."],
    starterCode: {
      c: `#include <stdbool.h>\n\nbool isValid(const char* s) {\n    // TODO: use a stack to match closing brackets\n    return false;\n}`,
      python: `def is_valid(s):\n    # TODO: use a stack to match closing brackets\n    return False`,
      java: `class Solution {\n    boolean isValid(String s) {\n        // TODO: use a stack to match closing brackets\n        return false;\n    }\n}`,
    },
  },
  {
    slug: "binary-tree-level-order", title: "Binary Tree Level Order Traversal", difficulty: "medium", topics: ["Binary Tree", "BFS"], visualization: "tree",
    description: "Given the root of a binary tree, return the level order traversal of its node values from left to right, level by level.",
    examples: ["Input: root = [3, 9, 20, null, null, 15, 7]", "Output: [[3], [9, 20], [15, 7]]"], constraints: ["The number of nodes is in the range [0, 2000].", "-1000 ≤ Node.val ≤ 1000."],
    starterCode: {
      c: `// struct TreeNode is provided by the judge\nint** levelOrder(struct TreeNode* root, int* returnSize) {\n    // TODO: visit nodes one level at a time\n    *returnSize = 0;\n    return NULL;\n}`,
      python: `def level_order(root):\n    # TODO: visit nodes one level at a time\n    return []`,
      java: `class Solution {\n    List<List<Integer>> levelOrder(TreeNode root) {\n        // TODO: visit nodes one level at a time\n        return new ArrayList<>();\n    }\n}`,
    },
  },
  {
    slug: "number-of-islands", title: "Number of Islands", difficulty: "medium", topics: ["Graph BFS", "Matrix"], visualization: "graph",
    description: "Given a 2D grid of '1' land and '0' water, count the number of islands. An island is connected horizontally or vertically, not diagonally.",
    examples: ["Input: grid = [[1,1,0],[0,1,0],[0,0,1]]", "Output: 2"], constraints: ["m and n are between 1 and 300.", "grid[i][j] is either '0' or '1'."],
    starterCode: {
      c: `int numIslands(char** grid, int gridSize, int* gridColSize) {\n    // TODO: explore each unvisited island\n    return 0;\n}`,
      python: `def num_islands(grid):\n    # TODO: explore each unvisited island\n    return 0`,
      java: `class Solution {\n    int numIslands(char[][] grid) {\n        // TODO: explore each unvisited island\n        return 0;\n    }\n}`,
    },
  },
  {
    slug: "binary-search", title: "Binary Search", difficulty: "easy", topics: ["Binary Search", "Arrays"], visualization: "array",
    description: "Given a sorted array of distinct integers and a target value, return the index of the target if it exists. Otherwise return -1.",
    examples: ["Input: nums = [-1,0,3,5,9,12], target = 9", "Output: 4"], constraints: ["1 ≤ nums.length ≤ 10⁴.", "All values in nums are distinct and sorted ascending."],
    starterCode: {
      c: `int search(int* nums, int numsSize, int target) {\n    // TODO: narrow the search interval each iteration\n    return -1;\n}`,
      python: `def search(nums, target):\n    # TODO: narrow the search interval each iteration\n    return -1`,
      java: `class Solution {\n    int search(int[] nums, int target) {\n        // TODO: narrow the search interval each iteration\n        return -1;\n    }\n}`,
    },
  },
  {
    slug: "merge-sort", title: "Merge Sort", difficulty: "medium", topics: ["Sorting", "Divide & conquer"], visualization: "array",
    description: "Sort an array of integers in ascending order using a divide-and-conquer strategy. Aim for predictable O(n log n) time.",
    examples: ["Input: nums = [5, 2, 3, 1]", "Output: [1, 2, 3, 5]"], constraints: ["1 ≤ nums.length ≤ 50,000.", "-50,000 ≤ nums[i] ≤ 50,000."],
    starterCode: {
      c: `void mergeSort(int* nums, int left, int right) {\n    // TODO: split, sort both halves, then merge\n}`,
      python: `def merge_sort(nums):\n    # TODO: split, sort both halves, then merge\n    return nums`,
      java: `class Solution {\n    void mergeSort(int[] nums, int left, int right) {\n        // TODO: split, sort both halves, then merge\n    }\n}`,
    },
  },
];

export function getProblem(slug: string) {
  return problems.find(problem => problem.slug === slug) ?? problems[0];
}
