PORT ?= 8001

.PHONY: run

run:
	python3 -m http.server $(PORT)
