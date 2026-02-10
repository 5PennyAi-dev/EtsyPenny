---
trigger: always_on
---

# Agent Rules & Coding Standards - EtsyPenny (5PennyAi)

1. **Planning Phase**: Before writing any code, analyze the problem and read all relevant files. You must write a detailed execution plan in `tasks/todo.md`. Check off items as you complete them to maintain a clear state of progress.

2. **Wait for Approval**: Before you begin any implementation, check in with the user. The plan in `tasks/todo.md` must be verified and approved before any code changes are made.

3. **Simplicity Above All**: Every task and code change must be as simple as humanly possible. Avoid over-engineering or massive architectural changes. Impact the minimum amount of code necessary. Your goal is to keep the codebase lean, readable, and bug-free.

4. **Maintain the "Vibe" & Visual Identity**: 
    - Strictly follow the existing tech stack (React, Vite, Tailwind, Supabase).
    - **UI Strict Adherence**: You must strictly follow the design specifications in `docs/styleguide.md` and the configurations in `tailwind.config.js`. 
    - Always use the predefined color palette (Indigo-600 for primary, Slate-50 for backgrounds, etc.) and spacing tokens. Do not guess colors or introduce new UI patterns.
    - Prioritize **Shadcn/UI** components and **Lucide-React** icons as defined in the tech stack.

5. **No Laziness (Senior Developer Mode)**: Do not provide partial code or placeholders (e.g., `// ... rest of code`). Always provide complete, functional code blocks or files. If a bug exists, find the root cause and fix it properly. No temporary "band-aid" fixes.

6. **UI/UX Intuition**: When modifying the interface, prioritize a clean, modern, and user-friendly aesthetic. Ensure visual consistency with the rest of the application. Refer to existing layouts (Dashboard, Sidebar, Result Page) to ensure every new component feels like it belongs to the same product.

7. **Continuous Communication**: Every step of the way, provide a high-level explanation of the changes you made. Keep it concise but informative. Focus on "Why" more than "What".

8. **Cleanup & Quality Control**: After completing a task, remove any dead code, unused variables, or debug logs (`console.log`). Ensure that your changes haven't introduced regressions. Verify responsive behavior (mobile/desktop).

9. **Final Review**: Add a "Review" section to the `todo.md` file with a summary of the changes made, any technical debt addressed, and relevant information or suggestions for the next steps.

10. **Persistent Context Management**: At the end of every work session, you MUST update the `docs/context.md` file. This file serves as the "Living Memory" of the project and will be the first file read at the start of any new session. 
    - **Content Requirements**: It must include a concise project summary, the finalized tech stack, core UI/Style specifications, and a "Latest Developments" section.
    - **Preserve History**: **NEVER OVERWRITE** the "Latest Developments" history. Always **APPEND** new items to the list or maintain a reverse-chronological order. You must keep a complete history of the project's evolution.
    - **Session Handover**: Summarize exactly what was achieved in the current session and clearly state the next immediate steps. 
    - **Consistency**: Ensure that any architectural or design decisions made during the session are reflected in this document to prevent future regressions.

---

**Personas**: Refer to `.agent/personas.md` to adopt the Architect, Developer, or UI/UX specialist roles as needed for the current task.

# MCP Directives 

- **Documentation First:** Before generating code for external libraries (especially `@supabase/supabase-js` or complex Tailwind animations), systematically use the `context7` MCP server to retrieve the latest syntax and best practices.
- **Database Management:** For any table creation, schema modification, or authentication logic, prioritize using the `Supabase` MCP server tools instead of providing manual SQL scripts. Ensure RLS (Row Level Security) is always considered.
- **Error Diagnosis:** In case of build errors or connection issues, use your MCP tools to diagnose the root cause before asking the user for help. Analyze logs and configuration files first.