import { Node, SyntaxKind, type SourceFile } from 'ts-morph';
import type { Route } from '../model.js';
import { slash } from '../config.js';
import { compact } from './ast.js';

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export function extractRoutes(source: SourceFile, filename: string): Route[] {
  const match = slash(filename).match(/(?:^|\/)app\/(.*?)\/?route\.[cm]?tsx?$/);
  if (!match) return [];
  const segments = match[1].split('/').filter(s => s && !/^\([^)]*\)$/.test(s) && !s.startsWith('@'));
  const routePath = '/' + segments.join('/');
  const params = segments.filter(s => s.startsWith('[')).map(s => s.replace(/[\[\]]/g, '').replace(/^\.\.\./, ''));
  const result: Route[] = [];
  for (const [name, declarations] of source.getExportedDeclarations()) {
    if (!METHODS.has(name)) continue;
    const route: Route = { method: name as Route['method'], path: routePath };
    if (params.length) route.params = params;
    const declaration = declarations[0];
    const fn = Node.isVariableDeclaration(declaration) ? declaration.getInitializer() : declaration;
    if (fn && (Node.isFunctionDeclaration(fn) || Node.isArrowFunction(fn) || Node.isFunctionExpression(fn))) {
      const annotation = fn.getReturnTypeNode();
      if (annotation) route.responseType = compact(annotation.getText());
      const body = fn.getBody();
      if (body) {
        for (const variable of body.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
          const init = variable.getInitializer();
          if (init && /\.json\s*\(/.test(init.getText())) {
            const explicit = variable.getTypeNode();
            if (explicit) route.bodyType = compact(explicit.getText());
            const cast = init.getFirstDescendantByKind(SyntaxKind.AsExpression) ?? (Node.isAsExpression(init) ? init : undefined);
            if (cast?.getTypeNode()) route.bodyType = compact(cast.getTypeNode()!.getText());
          }
        }
        if (!route.responseType) {
          for (const call of [...(Node.isCallExpression(body) ? [body] : []), ...body.getDescendantsOfKind(SyntaxKind.CallExpression)]) {
            if (/^(NextResponse|Response)\.json$/.test(call.getExpression().getText()) && call.getTypeArguments()[0]) {
              route.responseType = compact(call.getTypeArguments()[0].getText());
            }
          }
        }
      }
    }
    result.push(route);
  }
  return result.sort((a, b) => a.method.localeCompare(b.method));
}
