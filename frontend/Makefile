.RECIPEPREFIX := $(shell echo " ")
PATH := ./node_modules/.bin:$(PATH)

clean:
  rm -rf ./dist

web: web-clean web-build

web-clean:
  rm -rf ./dist/web

web-build:
  webpack --config ./webpack/web.config.js --progress --colors

web-serve:
  webpack-dev-server --config ./webpack/web.config.js --progress --colors

.PHONY: clean web web-clean web-build web-serve
