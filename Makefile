PORT ?= 8000
BIND ?= ::

.PHONY: run

run:
	python3 -m http.server $(PORT) --bind $(BIND)
