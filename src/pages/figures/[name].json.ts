import type { APIRoute, GetStaticPaths } from 'astro';
import { figureChunks, figureNames, type FigureName } from '@utils/figures';

/**
 * Each figure's drawing (SVG in pieces, then its labels), fetched when the
 * figure comes near and added a piece at a time (see IsoFigure `lazy` and
 * iso-kit.ts), so pages stay light and the main thread stays free.
 */
export const getStaticPaths: GetStaticPaths = () => figureNames.map(name => ({ params: { name } }));

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(figureChunks(params.name as FigureName)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
