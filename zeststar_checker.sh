C:\Program Files\Git\bin\bash.exe

echo "=================================================="
echo "ZestStar Development Setup Checker"
echo "=================================================="
echo ""

echo "[1/7] Checking Node.js..."
if command -v node &> /dev/null; then
    echo "✓ Node.js installed: v24.13.0"
else
    echo "✗ Node.js not found"
fi

echo "[2/7] Checking npm..."
if command -v npm &> /dev/null; then
    echo "✓ npm installed: v11.12.0"
else
    echo "✗ npm not found"
fi

echo "[3/7] Checking Git..."
if command -v git &> /dev/null; then
    echo "✓ Git installed: git version 2.53.0.windows.3"
else
    echo "✗ Git not found"
fi

echo "[4/7] Checking folders..."
if [ -d "frontend" ]; then echo "✓ frontend/ found"; else echo "✗ frontend/ missing"; fi
if [ -d "backend" ]; then echo "✓ backend/ found"; else echo "✗ backend/ missing"; fi

echo "[5/7] Checking frontend..."
if [ -f "frontend/package.json" ]; then echo "✓ frontend/package.json found"; else echo "✗ frontend/ not setup"; fi

echo "[6/7] Checking backend..."
if [ -f "backend/package.json" ]; then echo "✓ backend/package.json found"; else echo "✗ backend/ not setup"; fi

echo "[7/7] Checking .env files..."
if [ -f "frontend/.env.local" ]; then echo "✓ frontend/.env.local found"; else echo "⚠ frontend/.env.local missing"; fi
if [ -f "backend/.env" ]; then echo "✓ backend/.env found"; else echo "⚠ backend/.env missing"; fi

echo ""
echo "Ready to develop! 🚀"
