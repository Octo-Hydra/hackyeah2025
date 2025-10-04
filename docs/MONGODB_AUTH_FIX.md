# MongoDB Setup and Authentication Fix

## Issue: "Command find requires authentication during registration"

This error occurs when your MongoDB instance requires authentication but your connection string doesn't include credentials, or the credentials are incorrect.

## Solution

### Option 1: Use Docker Compose MongoDB (Recommended for Development)

1. **Start MongoDB with Docker Compose:**

   ```bash
   docker compose up -d
   ```

2. **Update your `.env` file with the correct MongoDB URI:**

   ```bash
   # For the docker-compose setup (username: admin, password: admin)
   MONGODB_URI=mongodb://admin:admin@localhost:27017/hackyeah2025?authSource=admin
   ```

   **Important:** The `authSource=admin` parameter is crucial when using MongoDB with authentication. It tells MongoDB to authenticate against the `admin` database.

3. **Restart your Next.js development server:**
   ```bash
   npm run dev
   ```

### Option 2: Use MongoDB Without Authentication (Local Development Only)

If you want to run MongoDB without authentication for local development:

1. **Update docker-compose.yml** to remove authentication:

   ```yaml
   services:
     mongo:
       image: mongo:7
       restart: unless-stopped
       ports:
         - "27017:27017"
       volumes:
         - mongo-data:/data/db
       # Remove MONGO_INITDB_ROOT_USERNAME and MONGO_INITDB_ROOT_PASSWORD
   ```

2. **Update your `.env` file:**

   ```bash
   MONGODB_URI=mongodb://localhost:27017/hackyeah2025
   ```

3. **Restart Docker Compose:**
   ```bash
   docker compose down
   docker compose up -d
   ```

### Option 3: Use MongoDB Atlas (Production)

For production or cloud development:

1. **Create a free MongoDB Atlas cluster** at https://www.mongodb.com/atlas

2. **Get your connection string** from Atlas (it will look like this):

   ```
   mongodb+srv://username:password@cluster.mongodb.net/hackyeah2025?retryWrites=true&w=majority
   ```

3. **Update your `.env` file:**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hackyeah2025?retryWrites=true&w=majority
   ```

## Current Docker Compose Configuration

Your current `docker-compose.yml` has:

- **Username:** `admin`
- **Password:** `admin`
- **Database:** `agentsfun` (you may want to change this to `hackyeah2025`)

### Recommended Connection String for Current Setup:

```bash
MONGODB_URI=mongodb://admin:admin@localhost:27017/agentsfun?authSource=admin
```

Or if you want to use a different database name:

```bash
MONGODB_URI=mongodb://admin:admin@localhost:27017/hackyeah2025?authSource=admin
```

## Verify MongoDB Connection

Test your MongoDB connection with:

```bash
# Using mongosh (MongoDB Shell)
mongosh "mongodb://admin:admin@localhost:27017/hackyeah2025?authSource=admin"

# Or using Node.js
node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI).then(() => console.log('✓ Connected')).catch(e => console.error('✗ Error:', e.message))"
```

## Troubleshooting

### Error: "MongoServerError: Authentication failed"

- Check that your username and password are correct
- Ensure you have `authSource=admin` in your connection string
- Verify MongoDB is running: `docker compose ps`

### Error: "connect ECONNREFUSED 127.0.0.1:27017"

- MongoDB is not running
- Start it with: `docker compose up -d`

### Error: "querySrv ENOTFOUND"

- This happens with MongoDB Atlas connection strings
- Check your internet connection
- Verify the cluster URL is correct
- Ensure your IP address is whitelisted in Atlas

## Next Steps

After fixing your MongoDB connection:

1. Test user registration at http://localhost:3000/auth/signin
2. Check MongoDB data:
   ```bash
   docker compose exec mongo mongosh -u admin -p admin --authenticationDatabase admin
   ```
3. View collections:
   ```javascript
   use hackyeah2025  // or agentsfun
   show collections
   db.users.find().pretty()
   ```
