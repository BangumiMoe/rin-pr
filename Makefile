NAME=rin-pr
VERSION=$(shell cat package.json | grep version | head -1 | sed 's/.*: "\([^"]*\)".*/\1/')-$(shell git log --format='%h' | head -1)
PORT=3012
REGISTRY_PREFIX=$(if $(REGISTRY),$(addsuffix /, $(REGISTRY)))

.PHONY: build publish

modules:
	git submodule update --init

build: modules
	docker build -t ${NAME}:${VERSION} .

publish:
	docker tag ${NAME}:${VERSION} ${REGISTRY_PREFIX}${NAME}:${VERSION}
	docker push ${REGISTRY_PREFIX}${NAME}:${VERSION}

