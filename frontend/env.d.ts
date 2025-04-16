// Declares types for environment variables accessed via process.env

// You might need to extend the global NodeJS ProcessEnv interface
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Add variables prefixed with EXPO_PUBLIC_ here
      // Use 'string | undefined' for safety
      EXPO_PUBLIC_API_URL: string | undefined;

      // Add others as needed
      // EXPO_PUBLIC_EXAMPLE_VAR: string | undefined;
    }
  }
}

// If the above doesn't work or causes conflicts, sometimes declaring the specific
// process.env property works, though extending global is often preferred:
// declare var process: {
//   env: {
//     EXPO_PUBLIC_API_URL: string | undefined;
//   }
// }

// Ensure this file is included in your tsconfig.json (usually automatic)
// You might need an empty export to make it a module if it complains:
export {};
