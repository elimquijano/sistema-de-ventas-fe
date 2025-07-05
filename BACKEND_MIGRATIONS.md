# Migraciones de Base de Datos

## 1. Migración: Crear tabla businesses

```sql
-- 2024_01_01_000001_create_businesses_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('tax_id')->nullable(); // RUC/NIT
            $table->string('currency', 3)->default('PEN'); // PEN, USD
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Owner
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('businesses');
    }
};
```

## 2. Migración: Crear tabla categories

```sql
-- 2024_01_01_000002_create_categories_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['product', 'service', 'expense'])->default('product');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'type', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('categories');
    }
};
```

## 3. Migración: Crear tabla products

```sql
-- 2024_01_01_000003_create_products_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('barcode')->nullable();
            $table->decimal('price', 10, 2);
            $table->decimal('cost', 10, 2);
            $table->integer('stock')->default(0);
            $table->integer('min_stock')->default(0);
            $table->string('image_path')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'category_id']);
            $table->index('barcode');
        });
    }

    public function down()
    {
        Schema::dropIfExists('products');
    }
};
```

## 4. Migración: Crear tabla services

```sql
-- 2024_01_01_000004_create_services_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->integer('duration')->nullable(); // en minutos
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'category_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('services');
    }
};
```

## 5. Migración: Crear tabla cash_registers

```sql
-- 2024_01_01_000005_create_cash_registers_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->decimal('initial_amount', 10, 2);
            $table->decimal('final_amount', 10, 2)->nullable();
            $table->decimal('expected_amount', 10, 2)->nullable();
            $table->decimal('difference', 10, 2)->nullable();
            $table->string('currency', 3)->default('PEN');
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->text('notes')->nullable();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('opened_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('closed_by')->nullable()->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'opened_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('cash_registers');
    }
};
```

## 6. Migración: Crear tabla sales

```sql
-- 2024_01_01_000006_create_sales_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('sale_number')->unique();
            $table->string('customer_name')->default('Cliente General');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->enum('payment_method', ['cash', 'card', 'transfer', 'credit'])->default('cash');
            $table->enum('payment_status', ['paid', 'pending', 'overdue'])->default('paid');
            $table->date('due_date')->nullable();
            $table->timestamp('sale_date');
            $table->text('notes')->nullable();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('cash_register_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'sale_date']);
            $table->index(['business_id', 'payment_status']);
            $table->index('sale_number');
        });
    }

    public function down()
    {
        Schema::dropIfExists('sales');
    }
};
```

## 7. Migración: Crear tabla sale_items

```sql
-- 2024_01_01_000007_create_sale_items_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->onDelete('cascade');
            $table->enum('item_type', ['product', 'service']);
            $table->unsignedBigInteger('item_id'); // product_id o service_id
            $table->string('item_name'); // Para mantener histórico
            $table->decimal('unit_price', 10, 2);
            $table->integer('quantity');
            $table->decimal('total_price', 10, 2);
            $table->timestamps();
            
            $table->index(['sale_id']);
            $table->index(['item_type', 'item_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('sale_items');
    }
};
```

## 8. Migración: Crear tabla expenses

```sql
-- 2024_01_01_000008_create_expenses_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->date('expense_date');
            $table->string('receipt_number')->nullable();
            $table->string('receipt_path')->nullable(); // Para subir imagen del recibo
            $table->text('notes')->nullable();
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'expense_date']);
            $table->index(['business_id', 'category_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('expenses');
    }
};
```

## 9. Migración: Crear tabla credits

```sql
-- 2024_01_01_000009_create_credits_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->onDelete('cascade');
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->decimal('total_amount', 10, 2);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->decimal('pending_amount', 10, 2);
            $table->date('due_date');
            $table->enum('status', ['pending', 'paid', 'overdue'])->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'due_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('credits');
    }
};
```

## 10. Migración: Crear tabla credit_payments

```sql
-- 2024_01_01_000010_create_credit_payments_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('credit_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credit_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->date('payment_date');
            $table->enum('payment_method', ['cash', 'card', 'transfer'])->default('cash');
            $table->text('notes')->nullable();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['credit_id', 'payment_date']);
            $table->index(['business_id', 'payment_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('credit_payments');
    }
};
```

## 11. Migración: Crear tabla loans

```sql
-- 2024_01_01_000011_create_loans_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->string('item_name');
            $table->text('item_description')->nullable();
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->date('loan_date');
            $table->date('due_date');
            $table->date('return_date')->nullable();
            $table->enum('status', ['pending', 'returned', 'overdue'])->default('pending');
            $table->text('notes')->nullable();
            $table->text('return_notes')->nullable();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('returned_by')->nullable()->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'due_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('loans');
    }
};
```

## 12. Migración: Agregar business_id a users

```sql
-- 2024_01_01_000012_add_business_id_to_users_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('business_id')->nullable()->after('id')->constrained()->onDelete('cascade');
            $table->enum('user_type', ['root', 'business_owner', 'employee'])->default('employee')->after('business_id');
            
            $table->index(['business_id', 'user_type']);
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropColumn(['business_id', 'user_type']);
        });
    }
};
```

## 13. Migración: Agregar business_id a roles y permissions

```sql
-- 2024_01_01_000013_add_business_id_to_roles_and_permissions.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->foreignId('business_id')->nullable()->after('id')->constrained()->onDelete('cascade');
            $table->index(['business_id']);
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->foreignId('business_id')->nullable()->after('id')->constrained()->onDelete('cascade');
            $table->index(['business_id']);
        });
    }

    public function down()
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropColumn('business_id');
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropColumn('business_id');
        });
    }
};
```

## Comandos para ejecutar las migraciones

```bash
# Ejecutar todas las migraciones
php artisan migrate

# Ejecutar migraciones específicas
php artisan migrate --path=/database/migrations/2024_01_01_000001_create_businesses_table.php

# Rollback de migraciones
php artisan migrate:rollback

# Refresh completo (cuidado en producción)
php artisan migrate:refresh

# Status de migraciones
php artisan migrate:status
```