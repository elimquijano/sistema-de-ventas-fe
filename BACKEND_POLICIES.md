# Políticas de Autorización (Policies)

## 1. BusinessPolicy

```php
<?php
// app/Policies/BusinessPolicy.php

namespace App\Policies;

use App\Models\Business;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BusinessPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->isRoot() || $user->isBusinessOwner();
    }

    public function view(User $user, Business $business): bool
    {
        return $user->isRoot() || $user->id === $business->user_id || $user->business_id === $business->id;
    }

    public function create(User $user): bool
    {
        return true; // Cualquier usuario puede crear un negocio
    }

    public function update(User $user, Business $business): bool
    {
        return $user->isRoot() || $user->id === $business->user_id;
    }

    public function delete(User $user, Business $business): bool
    {
        return $user->isRoot() || $user->id === $business->user_id;
    }
}
```

## 2. ProductPolicy

```php
<?php
// app/Policies/ProductPolicy.php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function view(User $user, Product $product): bool
    {
        return $user->isRoot() || $user->business_id === $product->business_id;
    }

    public function create(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function update(User $user, Product $product): bool
    {
        return $user->isRoot() || $user->business_id === $product->business_id;
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->isRoot() || $user->business_id === $product->business_id;
    }
}
```

## 3. SalePolicy

```php
<?php
// app/Policies/SalePolicy.php

namespace App\Policies;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SalePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function view(User $user, Sale $sale): bool
    {
        return $user->isRoot() || $user->business_id === $sale->business_id;
    }

    public function create(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function update(User $user, Sale $sale): bool
    {
        // Solo el creador de la venta o el dueño del negocio pueden editarla
        return $user->isRoot() || 
               $user->business_id === $sale->business_id && 
               ($user->id === $sale->created_by || $user->isBusinessOwner());
    }

    public function delete(User $user, Sale $sale): bool
    {
        // Solo el dueño del negocio o root pueden eliminar ventas
        return $user->isRoot() || 
               ($user->business_id === $sale->business_id && $user->isBusinessOwner());
    }
}
```

## 4. CashRegisterPolicy

```php
<?php
// app/Policies/CashRegisterPolicy.php

namespace App\Policies;

use App\Models\CashRegister;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CashRegisterPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function view(User $user, CashRegister $cashRegister): bool
    {
        return $user->isRoot() || $user->business_id === $cashRegister->business_id;
    }

    public function create(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function update(User $user, CashRegister $cashRegister): bool
    {
        return $user->isRoot() || 
               ($user->business_id === $cashRegister->business_id && 
                ($user->id === $cashRegister->opened_by || $user->isBusinessOwner()));
    }

    public function delete(User $user, CashRegister $cashRegister): bool
    {
        return $user->isRoot() || 
               ($user->business_id === $cashRegister->business_id && $user->isBusinessOwner());
    }
}
```

## 5. ExpensePolicy

```php
<?php
// app/Policies/ExpensePolicy.php

namespace App\Policies;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpensePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function view(User $user, Expense $expense): bool
    {
        return $user->isRoot() || $user->business_id === $expense->business_id;
    }

    public function create(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function update(User $user, Expense $expense): bool
    {
        return $user->isRoot() || 
               $user->business_id === $expense->business_id && 
               ($user->id === $expense->created_by || $user->isBusinessOwner());
    }

    public function delete(User $user, Expense $expense): bool
    {
        return $user->isRoot() || 
               ($user->business_id === $expense->business_id && 
                ($user->id === $expense->created_by || $user->isBusinessOwner()));
    }
}
```

## 6. CreditPolicy

```php
<?php
// app/Policies/CreditPolicy.php

namespace App\Policies;

use App\Models\Credit;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CreditPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function view(User $user, Credit $credit): bool
    {
        return $user->isRoot() || $user->business_id === $credit->business_id;
    }

    public function create(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function update(User $user, Credit $credit): bool
    {
        return $user->isRoot() || $user->business_id === $credit->business_id;
    }

    public function delete(User $user, Credit $credit): bool
    {
        return $user->isRoot() || 
               ($user->business_id === $credit->business_id && $user->isBusinessOwner());
    }
}
```

## 7. LoanPolicy

```php
<?php
// app/Policies/LoanPolicy.php

namespace App\Policies;

use App\Models\Loan;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LoanPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function view(User $user, Loan $loan): bool
    {
        return $user->isRoot() || $user->business_id === $loan->business_id;
    }

    public function create(User $user): bool
    {
        return $user->business_id !== null || $user->isRoot();
    }

    public function update(User $user, Loan $loan): bool
    {
        return $user->isRoot() || 
               $user->business_id === $loan->business_id && 
               ($user->id === $loan->created_by || $user->isBusinessOwner());
    }

    public function delete(User $user, Loan $loan): bool
    {
        return $user->isRoot() || 
               ($user->business_id === $loan->business_id && 
                ($user->id === $loan->created_by || $user->isBusinessOwner()));
    }
}
```

## 8. UserPolicy

```php
<?php
// app/Policies/UserPolicy.php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->isRoot() || $user->isBusinessOwner();
    }

    public function view(User $user, User $model): bool
    {
        return $user->isRoot() || 
               $user->id === $model->id || 
               ($user->isBusinessOwner() && $user->business_id === $model->business_id);
    }

    public function create(User $user): bool
    {
        return $user->isRoot() || $user->isBusinessOwner();
    }

    public function update(User $user, User $model): bool
    {
        return $user->isRoot() || 
               $user->id === $model->id || 
               ($user->isBusinessOwner() && $user->business_id === $model->business_id);
    }

    public function delete(User $user, User $model): bool
    {
        // No se puede eliminar a sí mismo
        if ($user->id === $model->id) {
            return false;
        }

        return $user->isRoot() || 
               ($user->isBusinessOwner() && $user->business_id === $model->business_id);
    }

    public function assignRoles(User $user, User $model): bool
    {
        return $user->isRoot() || 
               ($user->isBusinessOwner() && $user->business_id === $model->business_id);
    }
}
```

## Registro de Políticas

```php
<?php
// app/Providers/AuthServiceProvider.php

namespace App\Providers;

use App\Models\Business;
use App\Models\Product;
use App\Models\Sale;
use App\Models\CashRegister;
use App\Models\Expense;
use App\Models\Credit;
use App\Models\Loan;
use App\Models\User;
use App\Policies\BusinessPolicy;
use App\Policies\ProductPolicy;
use App\Policies\SalePolicy;
use App\Policies\CashRegisterPolicy;
use App\Policies\ExpensePolicy;
use App\Policies\CreditPolicy;
use App\Policies\LoanPolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Business::class => BusinessPolicy::class,
        Product::class => ProductPolicy::class,
        Sale::class => SalePolicy::class,
        CashRegister::class => CashRegisterPolicy::class,
        Expense::class => ExpensePolicy::class,
        Credit::class => CreditPolicy::class,
        Loan::class => LoanPolicy::class,
        User::class => UserPolicy::class,
    ];

    public function boot()
    {
        $this->registerPolicies();

        // Gates adicionales
        Gate::define('manage-business', function (User $user) {
            return $user->isRoot() || $user->isBusinessOwner();
        });

        Gate::define('access-pos', function (User $user) {
            return $user->business_id !== null;
        });

        Gate::define('manage-cash-register', function (User $user) {
            return $user->business_id !== null;
        });

        Gate::define('view-reports', function (User $user) {
            return $user->business_id !== null;
        });

        Gate::define('export-data', function (User $user) {
            return $user->isRoot() || $user->isBusinessOwner();
        });
    }
}
```

## Middleware para verificar permisos específicos

```php
<?php
// app/Http/Middleware/CheckPermission.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        if (!Gate::allows($permission)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción',
            ], 403);
        }

        return $next($request);
    }
}
```

## Uso en rutas

```php
// En routes/api.php

// Rutas que requieren permisos específicos
Route::middleware(['auth:sanctum', 'permission:manage-business'])->group(function () {
    Route::prefix('businesses')->group(function () {
        Route::post('/', [BusinessController::class, 'store']);
        Route::put('{business}', [BusinessController::class, 'update']);
        Route::delete('{business}', [BusinessController::class, 'destroy']);
    });
});

Route::middleware(['auth:sanctum', 'permission:access-pos'])->group(function () {
    Route::prefix('pos')->group(function () {
        // Rutas del punto de venta
    });
});

Route::middleware(['auth:sanctum', 'permission:export-data'])->group(function () {
    Route::prefix('reports')->group(function () {
        Route::get('export/sales', [ReportController::class, 'exportSales']);
        Route::get('export/products', [ReportController::class, 'exportProducts']);
    });
});
```