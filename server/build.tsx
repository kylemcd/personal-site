await Bun.build({
    entrypoints: ['./server/build-target.tsx'],
    outdir: './server/out',
});
