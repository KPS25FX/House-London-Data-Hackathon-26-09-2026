# Tools image for building/loading the graph. TuringDB only ships Linux/macOS
# wheels, so on Windows the Python SDK has to run in a container too.
# The server itself is the official turingdbai/turingdb container (see README.md).
FROM python:3.12-slim-bookworm

RUN pip install --no-cache-dir turingdb pandas

WORKDIR /app
COPY build_graph.py load_graph.py ./
