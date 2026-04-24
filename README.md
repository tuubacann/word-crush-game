# Word Crush Game Backend

Bu proje, Word Crush mobil oyunu için geliştirilmiş FastAPI tabanlı backend servisidir.

## Kullanılan Teknolojiler

- Python
- FastAPI
- MongoDB
- Docker
- Git / GitHub

## Çalıştırma

```bash
docker compose up --build
```

## API Endpoints

### 👤 Kullanıcı

POST /api/users  
→ Yeni kullanıcı oluştur

GET /api/users  
→ Tüm kullanıcıları getir

GET /api/users/{user_id}  
→ Tek kullanıcı getir

PUT /api/users/{user_id}  
→ Kullanıcı güncelle

DELETE /api/users/{user_id}  
→ Kullanıcı sil

---

### 🎮 Oyun

POST /api/game/start  
→ Yeni oyun başlat

POST /api/game/move  
→ Hamle yap

GET /api/game/grid  
→ Grid üret (test amaçlı)

POST /api/game/check-word  
→ Kelime kontrol et

POST /api/game/process-move  
→ Harf düşürme test

---

### 🏆 Skor

POST /api/scores  
→ Skor kaydet

GET /api/scores/{user_id}  
→ Kullanıcı skorları

GET /api/scores/{user_id}/summary  
→ Skor özeti

GET /api/leaderboard  
→ En iyi skorlar

---

### 🛒 Market

GET /api/market/jokers  
→ Joker listesi

POST /api/market/buy  
→ Joker satın al
