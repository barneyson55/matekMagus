.PHONY: install start test lint build

install:
	npm install

start:
	npm run start

test:
	npm run test

lint:
	@npm run lint || (echo "No lint script defined in package.json"; exit 0)

build:
	@npm run build || (echo "No build script defined in package.json"; exit 0)
