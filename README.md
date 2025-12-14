# Hotel Smart Button - Yearstar PBX Dashboard

A Next.js 16+ application with shadcn UI, Prisma ORM, and MySQL database that serves as a middleware between a Yearstar P550 gateway to receive live WebSocket events and display them on screen.

## 🚀 Features

- **Role-Based Authentication** with Auth.js v5 (ADMIN, MANAGER, EMPLOYEE)
- **WebSocket Integration** with Yearstar P550 PBX Gateway
- **Real-time Event Monitoring** - Display live PBX events
- **Call Management** - Initiate calls through the PBX
- **Extension Status Tracking** - Monitor extension states
- **Automatic Heartbeat** - Maintains WebSocket connection
- **Auto-Reconnection** - Automatically reconnects on connection loss
- **Event Logging** - All events stored in MySQL database
- **Beautiful UI** - Modern design with Tailwind CSS v4 and shadcn components

## 📋 Prerequisites

- Node.js 16+
- MySQL database
- Yearstar P550 PBX Gateway

## 🛠️ Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd /Volumes/EXTERNALSSD/hotelsmartbutton
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment variables** are already configured in `.env`:
   - Database: MySQL connection to `smartButtonAic`
   - Auth.js: Authentication secret and URL
   - Yearstar PBX: Connection credentials

4. **Database setup**:
   ```bash
   # Push schema to database (already done)
   npx prisma db push
   
   # Seed admin user (already done)
   npm run db:seed
   ```

## 👤 Default Admin User

- **Email**: `gkozyris@aic.gr`
- **Password**: `1f1femsk`
- **Role**: `ADMIN`

## 🎯 Usage

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Access the application**:
   - Open [http://localhost:3000](http://localhost:3000)
   - You'll be redirected to the sign-in page

3. **Sign in** with the admin credentials above

4. **Dashboard Features**:
   - **Connection Status**: View and manage PBX connection
   - **Connect to PBX**: Click "Connect to PBX" button
   - **Make Calls**: Enter extension numbers and initiate calls
   - **View Events**: Monitor real-time PBX events
   - **Auto-refresh**: Events and connection status update every 5 seconds

## 📁 Project Structure

```
hotelsmartbutton/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Auth.js routes
│   │   │   ├── pbx/           # PBX API endpoints
│   │   │   └── extensions/    # Extension management
│   │   ├── auth/
│   │   │   └── signin/        # Sign-in page
│   │   ├── dashboard/         # Main dashboard
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (redirects)
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   └── providers.tsx      # SessionProvider wrapper
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── yearstar-client.ts # WebSocket client
│   │   └── utils.ts           # Utility functions
│   ├── types/
│   │   └── next-auth.d.ts     # Auth.js type extensions
│   ├── auth.ts                # Auth.js configuration
│   └── middleware.ts          # Route protection
└── .env                       # Environment variables
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### PBX Connection
- `POST /api/pbx/connect` - Connect to PBX
- `GET /api/pbx/connect` - Check connection status
- `DELETE /api/pbx/connect` - Disconnect from PBX

### PBX Operations
- `POST /api/pbx/call` - Initiate a call
  ```json
  {
    "from": "100",
    "to": "200"
  }
  ```

### Events
- `GET /api/pbx/events?limit=10&type=RING` - Get PBX events

### Extensions
- `GET /api/extensions` - List all extensions
- `POST /api/extensions` - Create/update extension

## 🎨 Styling

The application uses:
- **Tailwind CSS v4** with custom theme
- **shadcn/ui** components
- **Roboto** font family
- **Amber/Orange** color scheme
- **Dark mode** support (can be toggled)

## 🔐 User Roles

- **ADMIN**: Full access to all features
- **MANAGER**: Management-level access
- **EMPLOYEE**: Basic access

## 📊 Database Models

### User
- Authentication and role management

### Extension
- PBX extension tracking
- Status monitoring (online, offline, busy, ringing)

### Call
- Call records
- Direction (inbound, outbound, internal)
- Duration tracking

### CallEvent
- Individual call events (RING, ANSWER, HANGUP, etc.)

### SystemEvent
- All WebSocket events from PBX
- Full event data logging

## 🔄 WebSocket Features

The Yearstar WebSocket client includes:
- **Authentication** with client credentials
- **Heartbeat** every 30 seconds
- **Auto-reconnection** on disconnect (5-second delay)
- **Event handlers** for custom event processing
- **Database logging** of all events

## 🚀 Deployment

For production deployment:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

3. **Environment variables**:
   - Update `AUTH_URL` to your production domain
   - Ensure database is accessible
   - Verify Yearstar PBX connectivity

## 📝 Database Management

**Always use `prisma db push` instead of migrations:**

```bash
# After schema changes
npx prisma db push

# Regenerate Prisma client
npx prisma generate
```

## 🐛 Troubleshooting

### WebSocket Connection Issues
- Verify PBX IP and port are correct
- Check client ID and secret
- Ensure network connectivity to PBX
- Check browser console for WebSocket errors

### Authentication Issues
- Clear browser cookies
- Verify database connection
- Check AUTH_SECRET is set
- Ensure user exists in database

### Database Issues
- Verify DATABASE_URL is correct
- Check MySQL server is running
- Ensure database exists
- Run `npx prisma db push` to sync schema

## 📚 Technologies Used

- **Next.js 16.0.8** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components
- **Auth.js v5** - Authentication
- **Prisma** - ORM
- **MySQL** - Database
- **ws** - WebSocket client
- **bcryptjs** - Password hashing

## 📄 License

This project is private and proprietary.

## 👥 Support

For support, contact the development team.
