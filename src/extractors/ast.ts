import { Node, Project, ScriptKind, ts } from 'ts-morph';

export function parseSource(filename: string, content: string) {
  const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true, compilerOptions: { noLib: true, noResolve: true } });
  const source = project.createSourceFile(filename, content, { scriptKind: filename.endsWith('.tsx') ? ScriptKind.TSX : ScriptKind.TS });
  const diagnostics = project.getProgram().compilerObject.getSyntacticDiagnostics(source.compilerNode);
  if (diagnostics.length) throw new Error(ts.flattenDiagnosticMessageText(diagnostics[0].messageText, ' '));
  return source;
}
/** Token-aware spacing preserves literal strings, unlike a whitespace regex. */
export function compact(text: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const tokens: string[] = [];
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) tokens.push(scanner.getTokenText());
  return tokens.join(' ').trim();
}
export function unwrap(node: Node): Node {
  if (Node.isAsExpression(node) || Node.isSatisfiesExpression(node) || Node.isParenthesizedExpression(node)) return unwrap(node.getExpression());
  return node;
}

