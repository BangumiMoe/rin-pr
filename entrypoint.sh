#!/bin/sh
set -eo pipefail

cd /app/rin-pr
if [ ! -e "public/index.html" ]; then
  # build
  ./node_modules/.bin/grunt
fi

su nobody -s /bin/sh -c "node $@"
