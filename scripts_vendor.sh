#!/usr/bin/env bash
# Fetch the open reference repos the pipeline reads (boundaries, lookups).
set -e
mkdir -p vendor && cd vendor
[ -d geo-lookups ] || git clone --depth 1 https://github.com/drkane/geo-lookups.git
[ -d mysociety-2025-constituencies ] || git clone --depth 1 https://github.com/mysociety/2025-constituencies.git mysociety-2025-constituencies
