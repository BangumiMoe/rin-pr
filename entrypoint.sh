#!/bin/sh
set -eo pipefail

cd /app/rin-pr
chmod a+rw public public/data public/data/tmp runtime/logs

if [ ! -e "public/index.html" ]; then
  # build frontend
  ./node_modules/.bin/grunt
fi

su nobody -s /bin/sh -c "node $@"
