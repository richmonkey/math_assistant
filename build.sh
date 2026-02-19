#!/bin/bash
cd web && rm -rf out && npm run build && cd ..
cd main && rm -rf dist && npm run build && cp -r ../web/out dist/out && npm run distMac