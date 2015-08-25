.RECIPEPREFIX := $(shell echo " ")
PATH := ./node_modules/.bin:$(PATH)

web:
  cd ./frontend/; make web
  [ -d ./public ] && rm -r ./public
  mkdir ./public
  cp -r ./frontend/dist/web/* ./public/

.PHONY: web
