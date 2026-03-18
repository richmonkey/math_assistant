curl -sS -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'


curl -X 'POST' \
  'http://localhost:8000/v1/agent/session' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJhZG1pbiIsImV4cCI6MTc3MzkyNDI2MH0.0r7FsPyan3wPYZhouHewLFdc4r89ZFAaCZP-3r-uwWE" \
  -d '{
  "paper_id": "1",
  "question_id": "1"
}'


 curl -X 'POST' \
  'http://localhost:8000/v1/agent/chat' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJhZG1pbiIsImV4cCI6MTc3MzkyNDI2MH0.0r7FsPyan3wPYZhouHewLFdc4r89ZFAaCZP-3r-uwWE" \
  -d '{
  "session_id": "session_0569eabf",
  "message": "可以啊， 你推荐一下。"
}'