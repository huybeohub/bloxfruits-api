from flask import Flask, request, jsonify
import time

app = Flask(__name__)

boss_list = []

# thêm boss
@app.route("/add", methods=["POST"])
def add():
    data = request.json
    
    boss = {
        "boss": data.get("boss"),
        "jobId": data.get("jobId"),
        "placeId": data.get("placeId"),
        "time": time.time()
    }

    # tránh trùng jobId
    for b in boss_list:
        if b["jobId"] == boss["jobId"]:
            return {"status": "duplicate"}

    boss_list.append(boss)

    return {"status": "ok"}

# lấy boss
@app.route("/get", methods=["GET"])
def get():
    # lọc boss còn "mới" (ví dụ 10 phút)
    now = time.time()
    valid = []

    for b in boss_list:
        if now - b["time"] < 600:
            valid.append(b)

    return jsonify(valid)

app.run(host="0.0.0.0", port=8000)
