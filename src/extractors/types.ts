import { Node, type SourceFile } from 'ts-morph';
import { compact } from './ast';
import type { CoreType } from '../model';

export function extractTypes(source: SourceFile): CoreType[] {
  const result: CoreType[] = [];
  for (const [name, declarations] of source.getExportedDeclarations()) {
    for (const declaration of declarations) {
      if (Node.isInterfaceDeclaration(declaration) || Node.isTypeAliasDeclaration(declaration) || Node.isEnumDeclaration(declaration)) {
        // AST printer omits JSDoc/comments and retains only public type declarations.
        const text = declaration.getText().replace(/^export\s+(?:declare\s+)?/, '');
        result.push({ name, signature: compact(text) });
      }
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

