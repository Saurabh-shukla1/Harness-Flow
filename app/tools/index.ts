export const tools = [
  {
    type: "function" as const,
    function: {
      name: "Read_File",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to read",
          },
        },
        required: ["file_path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "Write_File",
      description: "Write content to a file",
      parameters: {
        type: "object",
        required: ["file_path", "content"],
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to write",
          },
          content: {
            type: "string",
            description: "The content to write to the file",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "Bash",
      description: "Execute a bash command and return the output",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "Get_Current_Directory",
      description: "Returns the current working directory.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Search the web using Tavily and return relevant results. Also return the source URL after the content so that the user can verify the information. The depth parameter controls how many results to return and how much information to extract from each result. For basic, fast, ultra-fast: 1 API Credit and for advanced: 2 API Credits",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
          },
          depth: {
            type: "string",
            description: "The depth of the search. For basic, fast, ultra-fast: 1 API Credit and for advanced: 2 API Credits",
          }
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_current_datetime",
      description: "Returns the current date and time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function" as const,
    function: {
      name: "browser_action",
      description: `Perform a browser action on the currently loaded page. The browser session persists between calls.

Available actions:
- navigate: Load a URL (requires url).
- get_interactive_elements: Returns JSON list of all inputs, buttons and links with their CSS selectors. ALWAYS call this after navigate to discover the correct selectors before trying to type or click anything.
- type: Type text into an input field (requires selector, text). Use selectors discovered from get_interactive_elements.
- click: Click an element (requires selector). Use selectors from get_interactive_elements.
- wait: Wait for a selector to appear in the DOM (requires selector). Use after click if the page updates dynamically.
- extract_text: Return visible text of the current page.
- screenshot: Save a full-page screenshot to the ss/ folder.
- close: Close the browser.

Correct workflow for interacting with a form:
  1. navigate url="https://example.com"
  2. get_interactive_elements          ← discover selectors
  3. type selector="<from step 2>" text="..."
  4. click selector="<submit button from step 2>"
  5. wait selector="<result element>"  ← wait for dynamic content
  6. extract_text                       ← read the result
  7. screenshot                         ← capture the final state`,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["navigate", "get_interactive_elements", "type", "click", "wait", "extract_text", "screenshot", "close"],
            description: "The browser action to perform.",
          },
          url: {
            type: "string",
            description: "URL to navigate to (only for action=navigate).",
          },
          selector: {
            type: "string",
            description: "CSS selector of the element (for type, click, wait actions). Get valid selectors from get_interactive_elements first.",
          },
          text: {
            type: "string",
            description: "Text to type into the selected element (only for action=type).",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_action",
      description: "Perform a git action in a repository. Pass action-specific fields alongside action and directory.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["add", "commit", "push", "pull", "status", "diff", "log", "branch", "checkout", "merge", "rebase", "reset", "clean", "stash", "tag"],
            description: "The git action to perform",
          },
          directory: {
            type: "string",
            description: "The repository directory to run the git command in",
          },
          message: {
            type: "string",
            description: "Commit message (required for action=commit)",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "Files to stage (for action=add). Omit to stage all changes.",
          },
          branch: {
            type: "string",
            description: "Branch name (required for checkout/merge/rebase; optional for push/pull/log/reset)",
          },
          name: {
            type: "string",
            description: "Name for branch or tag actions",
          },
          staged: {
            type: "boolean",
            description: "If true, show staged diff (for action=diff)",
          },
          pop: {
            type: "boolean",
            description: "If true, pop the latest stash (for action=stash)",
          },
          limit: {
            type: "number",
            description: "Number of log entries to return (for action=log)",
          },
          mode: {
            type: "string",
            enum: ["soft", "mixed", "hard"],
            description: "Reset mode (for action=reset)",
          },
        },
        required: ["action", "directory"],
      },
    }
  }
];
