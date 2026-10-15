import type { APIRoute, GetStaticPaths } from 'astro';
import { figureNames, figureScript, type FigureName } from '@utils/figures';

/** Each figure's live script as a module, imported after its drawing loads. */
export const getStaticPaths: GetStaticPaths = () => figureNames.map(name => ({ params: { name } }));

export const GET: APIRoute = ({ params }) =>
  new Response(figureScript(params.name as FigureName), {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
