#!/bin/sh
# Website build: full HTML document + Supabase client + config. Usage: SB_URL=... SB_KEY=... ./build-web.sh
set -e
:
OUT=index.html
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  echo '<meta name="theme-color" content="#F2F2F7"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 28 28%27%3E%3Crect width=%2728%27 height=%2728%27 rx=%277%27 fill=%27%23007AFF%27/%3E%3Ccircle cx=%2714%27 cy=%2714%27 r=%274%27 fill=%27%23FF9500%27/%3E%3C/svg%3E">'
  cat src/head.html
  echo '<style>[hidden]{display:none!important} img{max-width:100%}</style>'
  echo '</head><body>'
  echo '<div id="app" class="app"></div>'
  echo '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>'
  echo "<script>window.FC_WEB={url:'${SB_URL}',key:'${SB_KEY}'};</script>"
  echo '<script>'
  cat src/core.js; echo; cat src/content.js; echo; cat src/lessons.js; echo; cat src/app.js
  echo '</script></body></html>'
} > $OUT
echo "built $OUT $(wc -c < $OUT) bytes"
