# Deployment Guide - Job Search Tracker Pro

## 🚀 Deployment Options

### 1. GitHub Pages (Free, Recommended)

#### Prerequisites
- GitHub account
- Repository created for the project

#### Steps
```bash
# Build the production version
npm run build

# Deploy to GitHub Pages
npm run deploy
```

#### Custom Domain Setup
1. Add `CNAME` file with your domain
2. Configure DNS settings at your domain provider
3. Enable HTTPS in repository settings

---

### 2. Netlify Deployment

#### Option A: Git Integration
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.` (root directory)
   - **Environment variables**: None required

#### Option B: Manual Deploy
```bash
# Build the project
npm run build

# Drag and drop the entire project folder to Netlify
```

#### Netlify Configuration (netlify.toml)
```toml
[build]
  command = "npm run build"
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"
```

---

### 3. Vercel Deployment

#### Quick Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Vercel Configuration (vercel.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "."
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

---

### 4. AWS S3 + CloudFront

#### S3 Setup
```bash
# Create S3 bucket
aws s3 mb s3://job-tracker-pro-yourname

# Build and sync
npm run build
aws s3 sync . s3://job-tracker-pro-yourname --delete

# Configure bucket for static website hosting
aws s3 website s3://job-tracker-pro-yourname --index-document index.html
```

#### CloudFront Distribution
- Origin: Your S3 bucket
- Default Root Object: `index.html`
- Error Pages: 404 → `/index.html` (for SPA routing)

---

### 5. Docker Deployment

#### Dockerfile
```dockerfile
FROM nginx:alpine

# Copy application files
COPY . /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Commands
```bash
# Build image
docker build -t job-tracker-pro .

# Run container
docker run -p 8080:80 job-tracker-pro
```

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /sw.js {
            add_header Cache-Control "no-cache";
        }
    }
}
```

---

### 6. Heroku Deployment

#### Setup
```bash
# Install Heroku CLI and login
heroku login

# Create Heroku app
heroku create job-tracker-pro-yourname

# Set buildpack for static site
heroku buildpacks:set https://github.com/heroku/heroku-buildpack-static.git
```

#### static.json
```json
{
  "root": ".",
  "routes": {
    "/**": "index.html"
  },
  "headers": {
    "/sw.js": {
      "Cache-Control": "no-cache"
    }
  }
}
```

#### Deploy
```bash
git push heroku main
```

---

## 🔧 Environment Configuration

### Environment Variables
No environment variables required - the app runs entirely client-side.

### Build Optimization

#### Production Build Script
```bash
#!/bin/bash
# build.sh

echo "Building Job Search Tracker Pro..."

# Create dist directory
mkdir -p dist

# Minify CSS
npx cleancss -o dist/style.min.css style.css

# Minify JavaScript
npx uglifyjs app.js -o dist/app.min.js --compress --mangle

# Copy HTML and update paths for production
sed 's/style.css/dist\/style.min.css/g; s/app.js/dist\/app.min.js/g' index.html > dist/index.html

echo "Build complete!"
```

### Performance Optimization

#### Service Worker Caching Strategy
```javascript
// sw.js
const CACHE_NAME = 'job-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

---

## 📊 Monitoring & Analytics

### Error Tracking
Since this is a client-side only application, implement error tracking:

```javascript
// Add to app.js
window.addEventListener('error', (event) => {
  console.error('Application Error:', event.error);
  // Send to logging service if needed
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});
```

### Performance Monitoring
```javascript
// Performance metrics
if ('performance' in window) {
  window.addEventListener('load', () => {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    console.log('Page Load Time:', loadTime, 'ms');
  });
}
```

---

## 🔒 Security Considerations

### Content Security Policy
Add to `index.html` `<head>`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data:;
">
```

### HTTPS Enforcement
```javascript
// Force HTTPS in production
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace('https:' + window.location.href.substring(window.location.protocol.length));
}
```

---

## 🧪 Testing in Production

### Health Check Endpoint
Create a simple health check:
```javascript
// Add to app.js
window.healthCheck = () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    storage: typeof(Storage) !== 'undefined',
    charts: typeof(Chart) !== 'undefined'
  };
};
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 https://your-domain.com/

# Using wrk
wrk -t12 -c400 -d30s https://your-domain.com/
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: .
```

---

## 📱 PWA Deployment Considerations

### App Store Distribution
While not required, you can distribute PWAs through app stores:

#### Microsoft Store
- Use PWABuilder: https://www.pwabuilder.com/
- Generate app packages for Windows

#### Google Play Store
- Use Trusted Web Activities (TWA)
- Requires additional Android wrapper

### Push Notifications Setup
```javascript
// Request notification permission
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Notifications enabled');
    }
  });
}
```

---

## 🚨 Troubleshooting Deployment

### Common Issues

**Build Fails:**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Clear npm cache: `npm cache clean --force`

**Service Worker Not Working:**
- Ensure HTTPS in production
- Check browser console for SW errors
- Verify SW file is accessible

**Charts Not Displaying:**
- Confirm Chart.js CDN is accessible
- Check Content Security Policy settings
- Verify canvas element support

**Data Not Persisting:**
- Check LocalStorage quotas
- Verify browser compatibility
- Test in non-incognito mode

### Debug Mode
Enable debug logging:
```javascript
// Add to app.js initialization
const DEBUG = window.location.hostname === 'localhost';
if (DEBUG) {
  console.log('Debug mode enabled');
  window.jobTracker = this; // Expose for debugging
}
```

---

## 📞 Support & Maintenance

### Monitoring Checklist
- [ ] Application loads successfully
- [ ] All interactive features functional
- [ ] Data import/export working
- [ ] Charts rendering correctly
- [ ] Mobile responsiveness verified
- [ ] Offline functionality tested
- [ ] Performance metrics within acceptable range

### Update Process
1. Test changes locally
2. Update version in `package.json`
3. Run full test suite
4. Deploy to staging environment
5. Verify functionality
6. Deploy to production
7. Monitor for issues

---

**Production deployment ready!** 🚀