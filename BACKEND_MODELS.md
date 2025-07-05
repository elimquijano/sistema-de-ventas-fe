# Modelos de Eloquent

## 1. Modelo Business

```php
<?php
// app/Models/Business.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Business extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'address',
        'phone',
        'email',
        'tax_id',
        'currency',
        'status',
        'user_id',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    // Relaciones
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function credits(): HasMany
    {
        return $this->hasMany(Credit::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(Loan::class);
    }

    public function cashRegisters(): HasMany
    {
        return $this->hasMany(CashRegister::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(Permission::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // Métodos auxiliares
    public function getFormattedCurrencyAttribute()
    {
        return $this->currency === 'PEN' ? 'S/.' : '$';
    }

    public function getTotalProductsAttribute()
    {
        return $this->products()->count();
    }

    public function getTotalServicesAttribute()
    {
        return $this->services()->count();
    }

    public function getTotalSalesAttribute()
    {
        return $this->sales()->count();
    }

    public function getCurrentMonthSalesAttribute()
    {
        return $this->sales()
            ->whereMonth('sale_date', now()->month)
            ->whereYear('sale_date', now()->year)
            ->sum('total_amount');
    }

    public function getTodaySalesAttribute()
    {
        return $this->sales()
            ->whereDate('sale_date', today())
            ->sum('total_amount');
    }
}
```

## 2. Modelo Product

```php
<?php
// app/Models/Product.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'barcode',
        'price',
        'cost',
        'stock',
        'min_stock',
        'image_path',
        'status',
        'category_id',
        'business_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'stock' => 'integer',
        'min_stock' => 'integer',
    ];

    protected $appends = [
        'image_url',
        'profit_margin',
        'is_low_stock',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class, 'item_id')->where('item_type', 'product');
    }

    // Accessors
    public function getImageUrlAttribute()
    {
        if ($this->image_path) {
            return Storage::url($this->image_path);
        }
        return null;
    }

    public function getProfitMarginAttribute()
    {
        if ($this->cost > 0) {
            return (($this->price - $this->cost) / $this->cost) * 100;
        }
        return 0;
    }

    public function getIsLowStockAttribute()
    {
        return $this->stock <= $this->min_stock;
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeLowStock($query)
    {
        return $query->whereRaw('stock <= min_stock');
    }

    public function scopeInStock($query)
    {
        return $query->where('stock', '>', 0);
    }

    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    // Métodos
    public function updateStock($quantity, $operation = 'subtract')
    {
        if ($operation === 'subtract') {
            $this->stock = max(0, $this->stock - $quantity);
        } else {
            $this->stock += $quantity;
        }
        $this->save();
    }

    public function canSell($quantity = 1)
    {
        return $this->status === 'active' && $this->stock >= $quantity;
    }
}
```

## 3. Modelo Service

```php
<?php
// app/Models/Service.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'duration',
        'status',
        'category_id',
        'business_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'duration' => 'integer',
    ];

    protected $appends = [
        'formatted_duration',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class, 'item_id')->where('item_type', 'service');
    }

    // Accessors
    public function getFormattedDurationAttribute()
    {
        if (!$this->duration) return null;
        
        if ($this->duration < 60) {
            return $this->duration . ' min';
        }
        
        $hours = floor($this->duration / 60);
        $minutes = $this->duration % 60;
        
        return $minutes > 0 ? "{$hours}h {$minutes}min" : "{$hours}h";
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }
}
```

## 4. Modelo Sale

```php
<?php
// app/Models/Sale.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_number',
        'customer_name',
        'subtotal',
        'tax',
        'discount',
        'total_amount',
        'payment_method',
        'payment_status',
        'due_date',
        'sale_date',
        'notes',
        'business_id',
        'cash_register_id',
        'created_by',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'sale_date' => 'datetime',
        'due_date' => 'date',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function credit(): HasOne
    {
        return $this->hasOne(Credit::class);
    }

    // Scopes
    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('sale_date', today());
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('sale_date', now()->month)
                    ->whereYear('sale_date', now()->year);
    }

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    public function scopePending($query)
    {
        return $query->where('payment_status', 'pending');
    }

    // Métodos
    public function generateSaleNumber()
    {
        $lastSale = static::where('business_id', $this->business_id)
            ->whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        $number = $lastSale ? (int) substr($lastSale->sale_number, -3) + 1 : 1;
        
        return 'V-' . str_pad($number, 3, '0', STR_PAD_LEFT);
    }

    public function calculateTotals()
    {
        $this->subtotal = $this->items->sum('total_price');
        $this->total_amount = $this->subtotal + $this->tax - $this->discount;
        $this->save();
    }

    public function isCredit()
    {
        return $this->payment_method === 'credit';
    }

    public function isPaid()
    {
        return $this->payment_status === 'paid';
    }
}
```

## 5. Modelo SaleItem

```php
<?php
// app/Models/SaleItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'item_type',
        'item_id',
        'item_name',
        'unit_price',
        'quantity',
        'total_price',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'quantity' => 'integer',
    ];

    // Relaciones
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function item(): MorphTo
    {
        return $this->morphTo('item', 'item_type', 'item_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'item_id');
    }

    // Métodos
    public function calculateTotal()
    {
        $this->total_price = $this->unit_price * $this->quantity;
        $this->save();
    }

    public function getItemModel()
    {
        if ($this->item_type === 'product') {
            return $this->product;
        }
        return $this->service;
    }
}
```

## 6. Modelo CashRegister

```php
<?php
// app/Models/CashRegister.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'initial_amount',
        'final_amount',
        'expected_amount',
        'difference',
        'currency',
        'opened_at',
        'closed_at',
        'status',
        'notes',
        'business_id',
        'opened_by',
        'closed_by',
    ];

    protected $casts = [
        'initial_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'expected_amount' => 'decimal:2',
        'difference' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    // Scopes
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    // Métodos
    public function calculateExpectedAmount()
    {
        $cashSales = $this->sales()
            ->where('payment_method', 'cash')
            ->where('payment_status', 'paid')
            ->sum('total_amount');

        $this->expected_amount = $this->initial_amount + $cashSales;
        $this->save();

        return $this->expected_amount;
    }

    public function close($finalAmount, $closedBy, $notes = null)
    {
        $this->calculateExpectedAmount();
        
        $this->final_amount = $finalAmount;
        $this->difference = $finalAmount - $this->expected_amount;
        $this->closed_at = now();
        $this->closed_by = $closedBy;
        $this->status = 'closed';
        $this->notes = $notes;
        
        $this->save();
    }

    public function getTotalSalesAttribute()
    {
        return $this->sales()->sum('total_amount');
    }

    public function getCashSalesAttribute()
    {
        return $this->sales()
            ->where('payment_method', 'cash')
            ->where('payment_status', 'paid')
            ->sum('total_amount');
    }
}
```

## 7. Modelo Credit

```php
<?php
// app/Models/Credit.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Credit extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'customer_name',
        'customer_phone',
        'total_amount',
        'paid_amount',
        'pending_amount',
        'due_date',
        'status',
        'notes',
        'business_id',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'pending_amount' => 'decimal:2',
        'due_date' => 'date',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(CreditPayment::class);
    }

    // Scopes
    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
                    ->orWhere(function($q) {
                        $q->where('status', 'pending')
                          ->where('due_date', '<', today());
                    });
    }

    // Métodos
    public function addPayment($amount, $paymentMethod = 'cash', $notes = null, $createdBy = null)
    {
        $payment = $this->payments()->create([
            'amount' => $amount,
            'payment_date' => today(),
            'payment_method' => $paymentMethod,
            'notes' => $notes,
            'business_id' => $this->business_id,
            'created_by' => $createdBy,
        ]);

        $this->paid_amount += $amount;
        $this->pending_amount = $this->total_amount - $this->paid_amount;
        
        if ($this->pending_amount <= 0) {
            $this->status = 'paid';
            $this->pending_amount = 0;
        }

        $this->save();

        return $payment;
    }

    public function updateStatus()
    {
        if ($this->pending_amount <= 0) {
            $this->status = 'paid';
        } elseif ($this->due_date < today()) {
            $this->status = 'overdue';
        } else {
            $this->status = 'pending';
        }
        
        $this->save();
    }

    public function isOverdue()
    {
        return $this->due_date < today() && $this->status !== 'paid';
    }
}
```

## 8. Modelo Expense

```php
<?php
// app/Models/Expense.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'description',
        'amount',
        'expense_date',
        'receipt_number',
        'receipt_path',
        'notes',
        'category_id',
        'business_id',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
    ];

    protected $appends = [
        'receipt_url',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Accessors
    public function getReceiptUrlAttribute()
    {
        if ($this->receipt_path) {
            return Storage::url($this->receipt_path);
        }
        return null;
    }

    // Scopes
    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('expense_date', today());
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('expense_date', now()->month)
                    ->whereYear('expense_date', now()->year);
    }

    public function scopeByCategory($query, $categoryId)
    {
        return $query->where('category_id', $categoryId);
    }
}
```

## 9. Modelo Category

```php
<?php
// app/Models/Category.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'type',
        'status',
        'business_id',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    // Métodos
    public function getItemsCountAttribute()
    {
        switch ($this->type) {
            case 'product':
                return $this->products()->count();
            case 'service':
                return $this->services()->count();
            case 'expense':
                return $this->expenses()->count();
            default:
                return 0;
        }
    }
}
```

## 10. Modelo Loan

```php
<?php
// app/Models/Loan.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Loan extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'customer_phone',
        'item_name',
        'item_description',
        'deposit_amount',
        'loan_date',
        'due_date',
        'return_date',
        'status',
        'notes',
        'return_notes',
        'business_id',
        'created_by',
        'returned_by',
    ];

    protected $casts = [
        'deposit_amount' => 'decimal:2',
        'loan_date' => 'date',
        'due_date' => 'date',
        'return_date' => 'date',
    ];

    // Relaciones
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by');
    }

    // Scopes
    public function scopeByBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
                    ->orWhere(function($q) {
                        $q->where('status', 'pending')
                          ->where('due_date', '<', today());
                    });
    }

    public function scopeReturned($query)
    {
        return $query->where('status', 'returned');
    }

    // Métodos
    public function markAsReturned($returnedBy, $returnNotes = null)
    {
        $this->return_date = today();
        $this->status = 'returned';
        $this->returned_by = $returnedBy;
        $this->return_notes = $returnNotes;
        $this->save();
    }

    public function updateStatus()
    {
        if ($this->status === 'pending' && $this->due_date < today()) {
            $this->status = 'overdue';
            $this->save();
        }
    }

    public function isOverdue()
    {
        return $this->due_date < today() && $this->status === 'pending';
    }

    public function getDaysOverdueAttribute()
    {
        if ($this->isOverdue()) {
            return today()->diffInDays($this->due_date);
        }
        return 0;
    }
}
```

## Actualización del Modelo User

```php
<?php
// Agregar al modelo User existente

// En las relaciones
public function business(): BelongsTo
{
    return $this->belongsTo(Business::class);
}

public function ownedBusinesses(): HasMany
{
    return $this->hasMany(Business::class, 'user_id');
}

public function sales(): HasMany
{
    return $this->hasMany(Sale::class, 'created_by');
}

public function expenses(): HasMany
{
    return $this->hasMany(Expense::class, 'created_by');
}

public function openedCashRegisters(): HasMany
{
    return $this->hasMany(CashRegister::class, 'opened_by');
}

public function closedCashRegisters(): HasMany
{
    return $this->hasMany(CashRegister::class, 'closed_by');
}

// Scopes
public function scopeByBusiness($query, $businessId)
{
    return $query->where('business_id', $businessId);
}

public function scopeBusinessOwners($query)
{
    return $query->where('user_type', 'business_owner');
}

public function scopeEmployees($query)
{
    return $query->where('user_type', 'employee');
}

// Métodos
public function isBusinessOwner()
{
    return $this->user_type === 'business_owner';
}

public function isRoot()
{
    return $this->user_type === 'root';
}

public function canAccessBusiness($businessId)
{
    return $this->isRoot() || $this->business_id === $businessId;
}
```