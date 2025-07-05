# Rutas del Backend (API)

## Archivo: routes/api.php

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\LoanController;
use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rutas públicas (sin autenticación)
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
});

// Rutas protegidas (requieren autenticación)
Route::middleware('auth:sanctum')->group(function () {
    
    // Autenticación
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::put('password', [AuthController::class, 'updatePassword']);
    });

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('stats', [DashboardController::class, 'stats']);
        Route::get('charts/{type}', [DashboardController::class, 'charts']);
        Route::get('recent-activity', [DashboardController::class, 'recentActivity']);
    });

    // Negocios
    Route::prefix('businesses')->group(function () {
        Route::get('/', [BusinessController::class, 'index']);
        Route::post('/', [BusinessController::class, 'store']);
        Route::get('{business}', [BusinessController::class, 'show']);
        Route::put('{business}', [BusinessController::class, 'update']);
        Route::delete('{business}', [BusinessController::class, 'destroy']);
        Route::get('{business}/stats', [BusinessController::class, 'stats']);
        Route::get('{business}/dashboard', [BusinessController::class, 'dashboard']);
    });

    // Productos
    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index']);
        Route::post('/', [ProductController::class, 'store']);
        Route::get('low-stock', [ProductController::class, 'lowStock']);
        Route::get('{product}', [ProductController::class, 'show']);
        Route::put('{product}', [ProductController::class, 'update']);
        Route::delete('{product}', [ProductController::class, 'destroy']);
        Route::patch('{product}/stock', [ProductController::class, 'updateStock']);
    });

    // Servicios
    Route::prefix('services')->group(function () {
        Route::get('/', [ServiceController::class, 'index']);
        Route::post('/', [ServiceController::class, 'store']);
        Route::get('{service}', [ServiceController::class, 'show']);
        Route::put('{service}', [ServiceController::class, 'update']);
        Route::delete('{service}', [ServiceController::class, 'destroy']);
    });

    // Categorías
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::post('/', [CategoryController::class, 'store']);
        Route::get('{category}', [CategoryController::class, 'show']);
        Route::put('{category}', [CategoryController::class, 'update']);
        Route::delete('{category}', [CategoryController::class, 'destroy']);
    });

    // Caja Registradora
    Route::prefix('cash-registers')->group(function () {
        Route::get('/', [CashRegisterController::class, 'index']);
        Route::post('/', [CashRegisterController::class, 'store']);
        Route::get('current', [CashRegisterController::class, 'current']);
        Route::get('{cashRegister}', [CashRegisterController::class, 'show']);
        Route::post('{cashRegister}/close', [CashRegisterController::class, 'close']);
        Route::get('{cashRegister}/report', [CashRegisterController::class, 'report']);
    });

    // Ventas
    Route::prefix('sales')->group(function () {
        Route::get('/', [SaleController::class, 'index']);
        Route::post('/', [SaleController::class, 'store']);
        Route::get('daily/{date?}', [SaleController::class, 'dailySales']);
        Route::get('monthly/{year}/{month}', [SaleController::class, 'monthlySales']);
        Route::get('{sale}', [SaleController::class, 'show']);
        Route::put('{sale}', [SaleController::class, 'update']);
        Route::delete('{sale}', [SaleController::class, 'destroy']);
    });

    // Gastos
    Route::prefix('expenses')->group(function () {
        Route::get('/', [ExpenseController::class, 'index']);
        Route::post('/', [ExpenseController::class, 'store']);
        Route::get('category/{categoryId}', [ExpenseController::class, 'byCategory']);
        Route::get('{expense}', [ExpenseController::class, 'show']);
        Route::put('{expense}', [ExpenseController::class, 'update']);
        Route::delete('{expense}', [ExpenseController::class, 'destroy']);
    });

    // Créditos
    Route::prefix('credits')->group(function () {
        Route::get('/', [CreditController::class, 'index']);
        Route::get('pending', [CreditController::class, 'pending']);
        Route::get('{credit}', [CreditController::class, 'show']);
        Route::post('{credit}/payment', [CreditController::class, 'addPayment']);
        Route::patch('{credit}/status', [CreditController::class, 'updateStatus']);
    });

    // Préstamos
    Route::prefix('loans')->group(function () {
        Route::get('/', [LoanController::class, 'index']);
        Route::post('/', [LoanController::class, 'store']);
        Route::get('pending', [LoanController::class, 'pending']);
        Route::get('{loan}', [LoanController::class, 'show']);
        Route::put('{loan}', [LoanController::class, 'update']);
        Route::delete('{loan}', [LoanController::class, 'destroy']);
        Route::post('{loan}/return', [LoanController::class, 'markAsReturned']);
    });

    // Usuarios
    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('{user}', [UserController::class, 'show']);
        Route::put('{user}', [UserController::class, 'update']);
        Route::delete('{user}', [UserController::class, 'destroy']);
        Route::patch('{user}/status', [UserController::class, 'updateStatus']);
        Route::post('{user}/roles', [UserController::class, 'assignRoles']);
    });

    // Roles
    Route::prefix('roles')->group(function () {
        Route::get('/', [RoleController::class, 'index']);
        Route::post('/', [RoleController::class, 'store']);
        Route::get('{role}', [RoleController::class, 'show']);
        Route::put('{role}', [RoleController::class, 'update']);
        Route::delete('{role}', [RoleController::class, 'destroy']);
        Route::post('{role}/permissions', [RoleController::class, 'assignPermissions']);
    });

    // Permisos
    Route::prefix('permissions')->group(function () {
        Route::get('/', [PermissionController::class, 'index']);
        Route::post('/', [PermissionController::class, 'store']);
        Route::get('module/{moduleId}', [PermissionController::class, 'getByModule']);
        Route::get('{permission}', [PermissionController::class, 'show']);
        Route::put('{permission}', [PermissionController::class, 'update']);
        Route::delete('{permission}', [PermissionController::class, 'destroy']);
    });

    // Módulos
    Route::prefix('modules')->group(function () {
        Route::get('/', [ModuleController::class, 'index']);
        Route::post('/', [ModuleController::class, 'store']);
        Route::get('tree', [ModuleController::class, 'tree']);
        Route::get('menu', [ModuleController::class, 'menu']);
        Route::get('route-config', [ModuleController::class, 'routeConfig']);
        Route::get('{module}', [ModuleController::class, 'show']);
        Route::put('{module}', [ModuleController::class, 'update']);
        Route::delete('{module}', [ModuleController::class, 'destroy']);
    });

    // Notificaciones
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('unread-count', [NotificationController::class, 'unreadCount']);
        Route::patch('{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::patch('mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::delete('{notification}', [NotificationController::class, 'destroy']);
    });
});

// Ruta para obtener información del usuario autenticado
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
```

## Middleware personalizado para Business Scope

```php
<?php
// app/Http/Middleware/BusinessScope.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BusinessScope
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        // Si es usuario root, puede acceder a cualquier negocio
        if ($user->isRoot()) {
            return $next($request);
        }
        
        // Para otros usuarios, verificar que tengan un negocio asignado
        if (!$user->business_id) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no tiene negocio asignado',
            ], 403);
        }
        
        // Agregar business_id a la request para uso en controladores
        $request->merge(['business_id' => $user->business_id]);
        
        return $next($request);
    }
}
```

## Registro del Middleware

```php
<?php
// app/Http/Kernel.php

protected $routeMiddleware = [
    // ... otros middlewares
    'business.scope' => \App\Http\Middleware\BusinessScope::class,
];
```

## Aplicar Middleware a rutas específicas

```php
// En routes/api.php, agregar el middleware a las rutas que lo necesiten

Route::middleware(['auth:sanctum', 'business.scope'])->group(function () {
    // Todas las rutas de negocio aquí
    Route::prefix('products')->group(function () {
        // rutas de productos
    });
    
    Route::prefix('sales')->group(function () {
        // rutas de ventas
    });
    
    // etc...
});
```

## Rutas adicionales para reportes y exportación

```php
// Rutas para reportes y exportación
Route::middleware(['auth:sanctum', 'business.scope'])->prefix('reports')->group(function () {
    
    // Reportes de ventas
    Route::prefix('sales')->group(function () {
        Route::get('daily', [ReportController::class, 'dailySales']);
        Route::get('monthly', [ReportController::class, 'monthlySales']);
        Route::get('yearly', [ReportController::class, 'yearlySales']);
        Route::get('export/excel', [ReportController::class, 'exportSalesToExcel']);
        Route::get('export/pdf', [ReportController::class, 'exportSalesToPdf']);
    });
    
    // Reportes de productos
    Route::prefix('products')->group(function () {
        Route::get('stock', [ReportController::class, 'stockReport']);
        Route::get('low-stock', [ReportController::class, 'lowStockReport']);
        Route::get('top-selling', [ReportController::class, 'topSellingProducts']);
        Route::get('export/excel', [ReportController::class, 'exportProductsToExcel']);
    });
    
    // Reportes de gastos
    Route::prefix('expenses')->group(function () {
        Route::get('monthly', [ReportController::class, 'monthlyExpenses']);
        Route::get('by-category', [ReportController::class, 'expensesByCategory']);
        Route::get('export/excel', [ReportController::class, 'exportExpensesToExcel']);
    });
    
    // Reportes de créditos
    Route::prefix('credits')->group(function () {
        Route::get('pending', [ReportController::class, 'pendingCredits']);
        Route::get('overdue', [ReportController::class, 'overdueCredits']);
        Route::get('export/excel', [ReportController::class, 'exportCreditsToExcel']);
    });
});
```

## Rutas para subida de archivos

```php
// Rutas para manejo de archivos
Route::middleware(['auth:sanctum'])->prefix('files')->group(function () {
    Route::post('upload/product-image', [FileController::class, 'uploadProductImage']);
    Route::post('upload/receipt', [FileController::class, 'uploadReceipt']);
    Route::delete('delete/{path}', [FileController::class, 'deleteFile']);
});
```

## Configuración de CORS

```php
<?php
// config/cors.php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'], // En producción, especificar dominios exactos
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```