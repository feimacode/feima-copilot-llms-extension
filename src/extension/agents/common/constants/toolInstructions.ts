/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * VS Code-specific tool usage instructions injected into Codex sessions.
 * These guide the model to prefer VS Code's native file editing tools over shell commands.
 */
export const VS_CODE_TOOL_INSTRUCTIONS = `CRITICAL FILE EDITING RULES:

You are operating in VS Code with dedicated file editing tools. You MUST use these tools for ALL file operations.

FORBIDDEN APPROACHES (DO NOT USE):
- ❌ Shell commands for file creation/editing (cat > file, echo > file, tee, printf > file)
- ❌ Python scripts for file editing (open(file, 'w'), Path.write_text, etc.)
- ❌ Node.js scripts for file editing (fs.writeFileSync, etc.)
- ❌ Any other scripting language for file operations

REQUIRED APPROACHES:
✅ Use 'writeFile' to create new files or completely replace existing files
✅ Use 'replaceInFile' to modify specific parts of existing files
✅ Use 'vscode_editFile_internal' for complex edits when available

WHY THIS MATTERS:
- VS Code tools are integrated with the editor's undo/redo system
- They provide proper syntax highlighting and validation
- They work with VS Code's file watching and auto-save
- They're safer and less error-prone than shell commands
- They integrate with VS Code's diff view and change tracking

EXAMPLES:
❌ WRONG: exec_command("cat > config.json << 'EOF'\\n{"key": "value"}\\nEOF")
✅ RIGHT: writeFile("config.json", "{\\"key\\": \\"value\\"}")

❌ WRONG: exec_command("python3 -c \\"open('file.txt', 'w').write('content')\\"")
✅ RIGHT: writeFile("file.txt", "content")

❌ WRONG: exec_command("sed -i 's/old/new/g' file.txt")
✅ RIGHT: replaceInFile("file.txt", "old", "new")

Always prefer the dedicated file editing tools over any other approach.`;
