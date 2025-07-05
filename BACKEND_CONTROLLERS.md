# Controladores del Backend

## 1. BusinessController

```php
<?php
// app/Http/Controllers/BusinessController.php

namespace App\Http\Controllers;

use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BusinessController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $query = Business::with(['owner']);
        
        // Solo root puede ver todos los negocios
        if (!$user->isRoot()) {
            $query->where('user_id', $user->id);
        }
        
        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $businesses = $query->paginate($request->get('per_page', 15));
        
        return response()->json([
            'success' => true,
            'data' => $businesses,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'tax_id' => 'nullable|string|max:50',
            'currency' => 'required|in:PEN,USD',
            'status' => 'required|in:active,inactive',
        ]);

        $business = Business::create([
            ...$request->all(),
            'user_id' => Auth::id(),
        ]);

        // Asignar el negocio al usuario
        Auth::user()->update([
            'business_id' => $business->id,
            'user_type' => 'business_owner'
        ]);

        // Crear categorías por defecto
        $this->createDefaultCategories($business);

        return response()->json([
            'success' => true,
            'message' => 'Negocio creado exitosamente',
            'data' => $business->load('owner'),
        ], 201);
    }

    public function show(Business $business): JsonResponse
    {
        $this->authorize('view', $business);
        
        $business->load([
            'owner',
            'products' => function($q) { $q->active(); },
            'services' => function($q) { $q->active(); },
            'categories' => function($q) { $q->active(); }
        ]);

        return response()->json([
            'success' => true,
            'data' => $business,
        ]);
    }

    public function update(Request $request, Business $business): JsonResponse
    {
        $this->authorize('update', $business);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'tax_id' => 'nullable|string|max:50',
            'currency' => 'required|in:PEN,USD',
            'status' => 'required|in:active,inactive',
        ]);

        $business->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Negocio actualizado exitosamente',
            'data' => $business->load('owner'),
        ]);
    }

    public function destroy(Business $business): JsonResponse
    {
        $this->authorize('delete', $business);
        
        $business->delete();

        return response()->json([
            'success' => true,
            'message' => 'Negocio eliminado exitosamente',
        ]);
    }

    public function stats(Business $business): JsonResponse
    {
        $this->authorize('view', $business);
        
        $stats = [
            'total_products' => $business->products()->active()->count(),
            'total_services' => $business->services()->active()->count(),
            'total_sales' => $business->sales()->count(),
            'today_sales' => $business->today_sales,
            'current_month_sales' => $business->current_month_sales,
            'low_stock_products' => $business->products()->lowStock()->count(),
            'pending_credits' => $business->credits()->pending()->count(),
            'overdue_loans' => $business->loans()->overdue()->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    public function dashboard(Business $business): JsonResponse
    {
        $this->authorize('view', $business);
        
        // Estadísticas generales
        $stats = [
            'daily_sales' => $business->sales()->today()->sum('total_amount'),
            'monthly_sales' => $business->sales()->thisMonth()->sum('total_amount'),
            'daily_expenses' => $business->expenses()->today()->sum('amount'),
            'monthly_expenses' => $business->expenses()->thisMonth()->sum('amount'),
            'products_low_stock' => $business->products()->lowStock()->count(),
            'pending_credits' => $business->credits()->pending()->count(),
            'cash_in_register' => $this->getCurrentCashAmount($business),
            'profit_margin' => $this->calculateProfitMargin($business),
        ];

        // Ventas de la última semana
        $salesData = $this->getWeeklySalesData($business);
        
        // Productos más vendidos
        $topProducts = $this->getTopSellingProducts($business);
        
        // Actividad reciente
        $recentActivity = $this->getRecentActivity($business);

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'sales_data' => $salesData,
                'top_products' => $topProducts,
                'recent_activity' => $recentActivity,
            ],
        ]);
    }

    private function createDefaultCategories(Business $business)
    {
        $categories = [
            ['name' => 'Bebidas', 'type' => 'product'],
            ['name' => 'Alimentos', 'type' => 'product'],
            ['name' => 'Limpieza', 'type' => 'product'],
            ['name' => 'Belleza', 'type' => 'service'],
            ['name' => 'Reparaciones', 'type' => 'service'],
            ['name' => 'Inventario', 'type' => 'expense'],
            ['name' => 'Servicios', 'type' => 'expense'],
            ['name' => 'Nómina', 'type' => 'expense'],
        ];

        foreach ($categories as $category) {
            $business->categories()->create($category);
        }
    }

    private function getCurrentCashAmount(Business $business)
    {
        $openRegister = $business->cashRegisters()->open()->first();
        return $openRegister ? $openRegister->initial_amount + $openRegister->cash_sales : 0;
    }

    private function calculateProfitMargin(Business $business)
    {
        $sales = $business->sales()->thisMonth()->sum('total_amount');
        $expenses = $business->expenses()->thisMonth()->sum('amount');
        
        if ($sales > 0) {
            return (($sales - $expenses) / $sales) * 100;
        }
        
        return 0;
    }

    private function getWeeklySalesData(Business $business)
    {
        return DB::table('sales')
            ->select(
                DB::raw('DATE(sale_date) as date'),
                DB::raw('SUM(total_amount) as sales'),
                DB::raw('COUNT(*) as count')
            )
            ->where('business_id', $business->id)
            ->where('sale_date', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get();
    }

    private function getTopSellingProducts(Business $business, $limit = 5)
    {
        return DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->select(
                'sale_items.item_name as name',
                DB::raw('SUM(sale_items.quantity) as quantity'),
                DB::raw('SUM(sale_items.total_price) as revenue')
            )
            ->where('sales.business_id', $business->id)
            ->where('sale_items.item_type', 'product')
            ->where('sales.sale_date', '>=', now()->subDays(30))
            ->groupBy('sale_items.item_name')
            ->orderBy('quantity', 'desc')
            ->limit($limit)
            ->get();
    }

    private function getRecentActivity(Business $business, $limit = 10)
    {
        $activities = collect();

        // Ventas recientes
        $recentSales = $business->sales()
            ->with('creator')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function($sale) {
                return [
                    'type' => 'sale',
                    'description' => "Venta {$sale->sale_number} - {$sale->customer_name}",
                    'amount' => $sale->total_amount,
                    'time' => $sale->created_at->diffForHumans(),
                    'created_at' => $sale->created_at,
                ];
            });

        // Gastos recientes
        $recentExpenses = $business->expenses()
            ->with('creator')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function($expense) {
                return [
                    'type' => 'expense',
                    'description' => $expense->description,
                    'amount' => -$expense->amount,
                    'time' => $expense->created_at->diffForHumans(),
                    'created_at' => $expense->created_at,
                ];
            });

        return $activities
            ->merge($recentSales)
            ->merge($recentExpenses)
            ->sortByDesc('created_at')
            ->take($limit)
            ->values();
    }
}
```

## 2. ProductController

```php
<?php
// app/Http/Controllers/ProductController.php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $query = Product::with(['category', 'business'])
            ->byBusiness($business->id);
        
        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('low_stock') && $request->low_stock) {
            $query->lowStock();
        }
        
        $products = $query->paginate($request->get('per_page', 15));
        
        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'barcode' => 'nullable|string|max:100|unique:products,barcode',
            'price' => 'required|numeric|min:0',
            'cost' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'min_stock' => 'required|integer|min:0',
            'category_id' => 'nullable|exists:categories,id',
            'status' => 'required|in:active,inactive',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $data = $request->except('image');
        $data['business_id'] = $business->id;

        // Manejar imagen
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image_path'] = $imagePath;
        }

        $product = Product::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Producto creado exitosamente',
            'data' => $product->load('category'),
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $this->authorize('view', $product);
        
        $product->load(['category', 'business']);

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'barcode' => 'nullable|string|max:100|unique:products,barcode,' . $product->id,
            'price' => 'required|numeric|min:0',
            'cost' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'min_stock' => 'required|integer|min:0',
            'category_id' => 'nullable|exists:categories,id',
            'status' => 'required|in:active,inactive',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $data = $request->except('image');

        // Manejar imagen
        if ($request->hasFile('image')) {
            // Eliminar imagen anterior
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image_path'] = $imagePath;
        }

        $product->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado exitosamente',
            'data' => $product->load('category'),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);
        
        // Eliminar imagen
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }
        
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado exitosamente',
        ]);
    }

    public function updateStock(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        
        $request->validate([
            'stock' => 'required|integer|min:0',
            'operation' => 'required|in:add,subtract,set',
        ]);

        switch ($request->operation) {
            case 'add':
                $product->stock += $request->stock;
                break;
            case 'subtract':
                $product->stock = max(0, $product->stock - $request->stock);
                break;
            case 'set':
                $product->stock = $request->stock;
                break;
        }

        $product->save();

        return response()->json([
            'success' => true,
            'message' => 'Stock actualizado exitosamente',
            'data' => $product,
        ]);
    }

    public function lowStock(): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $products = Product::with(['category'])
            ->byBusiness($business->id)
            ->lowStock()
            ->active()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    private function getCurrentBusiness(): Business
    {
        $user = Auth::user();
        
        if ($user->isRoot()) {
            // Para usuarios root, necesitamos el business_id en la request
            $businessId = request('business_id');
            if (!$businessId) {
                abort(400, 'business_id es requerido para usuarios root');
            }
            return Business::findOrFail($businessId);
        }
        
        return $user->business;
    }
}
```

## 3. SaleController

```php
<?php
// app/Http/Controllers/SaleController.php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Product;
use App\Models\Service;
use App\Models\Business;
use App\Models\CashRegister;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $query = Sale::with(['items', 'creator', 'cashRegister'])
            ->byBusiness($business->id);
        
        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('sale_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }
        
        if ($request->has('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        
        if ($request->has('date_from')) {
            $query->whereDate('sale_date', '>=', $request->date_from);
        }
        
        if ($request->has('date_to')) {
            $query->whereDate('sale_date', '<=', $request->date_to);
        }
        
        $sales = $query->latest('sale_date')->paginate($request->get('per_page', 15));
        
        return response()->json([
            'success' => true,
            'data' => $sales,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $request->validate([
            'customer_name' => 'required|string|max:255',
            'payment_method' => 'required|in:cash,card,transfer,credit',
            'items' => 'required|array|min:1',
            'items.*.type' => 'required|in:product,service',
            'items.*.id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'due_date' => 'required_if:payment_method,credit|date|after:today',
        ]);

        return DB::transaction(function () use ($request, $business) {
            // Crear la venta
            $sale = Sale::create([
                'sale_number' => $this->generateSaleNumber($business),
                'customer_name' => $request->customer_name,
                'payment_method' => $request->payment_method,
                'payment_status' => $request->payment_method === 'credit' ? 'pending' : 'paid',
                'due_date' => $request->due_date,
                'sale_date' => now(),
                'notes' => $request->notes,
                'business_id' => $business->id,
                'cash_register_id' => $this->getCurrentCashRegisterId($business),
                'created_by' => Auth::id(),
                'subtotal' => 0,
                'tax' => 0,
                'discount' => 0,
                'total_amount' => 0,
            ]);

            $subtotal = 0;

            // Procesar items
            foreach ($request->items as $itemData) {
                $item = $this->getItem($itemData['type'], $itemData['id']);
                
                // Verificar stock para productos
                if ($itemData['type'] === 'product') {
                    if (!$item->canSell($itemData['quantity'])) {
                        throw new \Exception("Stock insuficiente para {$item->name}");
                    }
                    
                    // Actualizar stock
                    $item->updateStock($itemData['quantity'], 'subtract');
                }

                $totalPrice = $itemData['price'] * $itemData['quantity'];
                $subtotal += $totalPrice;

                // Crear item de venta
                $sale->items()->create([
                    'item_type' => $itemData['type'],
                    'item_id' => $item->id,
                    'item_name' => $item->name,
                    'unit_price' => $itemData['price'],
                    'quantity' => $itemData['quantity'],
                    'total_price' => $totalPrice,
                ]);
            }

            // Actualizar totales
            $sale->update([
                'subtotal' => $subtotal,
                'total_amount' => $subtotal, // Sin impuestos por ahora
            ]);

            // Crear crédito si es necesario
            if ($request->payment_method === 'credit') {
                $sale->credit()->create([
                    'customer_name' => $request->customer_name,
                    'customer_phone' => $request->customer_phone ?? null,
                    'total_amount' => $sale->total_amount,
                    'paid_amount' => 0,
                    'pending_amount' => $sale->total_amount,
                    'due_date' => $request->due_date,
                    'business_id' => $business->id,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Venta registrada exitosamente',
                'data' => $sale->load(['items', 'credit']),
            ], 201);
        });
    }

    public function show(Sale $sale): JsonResponse
    {
        $this->authorize('view', $sale);
        
        $sale->load(['items', 'creator', 'cashRegister', 'credit']);

        return response()->json([
            'success' => true,
            'data' => $sale,
        ]);
    }

    public function update(Request $request, Sale $sale): JsonResponse
    {
        $this->authorize('update', $sale);
        
        $request->validate([
            'customer_name' => 'required|string|max:255',
            'payment_status' => 'required|in:paid,pending,overdue',
            'notes' => 'nullable|string',
        ]);

        $sale->update($request->only(['customer_name', 'payment_status', 'notes']));

        return response()->json([
            'success' => true,
            'message' => 'Venta actualizada exitosamente',
            'data' => $sale->load(['items', 'credit']),
        ]);
    }

    public function destroy(Sale $sale): JsonResponse
    {
        $this->authorize('delete', $sale);
        
        return DB::transaction(function () use ($sale) {
            // Restaurar stock de productos
            foreach ($sale->items as $item) {
                if ($item->item_type === 'product') {
                    $product = Product::find($item->item_id);
                    if ($product) {
                        $product->updateStock($item->quantity, 'add');
                    }
                }
            }
            
            $sale->delete();

            return response()->json([
                'success' => true,
                'message' => 'Venta eliminada exitosamente',
            ]);
        });
    }

    public function dailySales(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        $date = $request->get('date', today()->toDateString());
        
        $sales = Sale::with(['items'])
            ->byBusiness($business->id)
            ->whereDate('sale_date', $date)
            ->get();

        $summary = [
            'total_sales' => $sales->count(),
            'total_amount' => $sales->sum('total_amount'),
            'cash_sales' => $sales->where('payment_method', 'cash')->sum('total_amount'),
            'card_sales' => $sales->where('payment_method', 'card')->sum('total_amount'),
            'credit_sales' => $sales->where('payment_method', 'credit')->sum('total_amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'sales' => $sales,
                'summary' => $summary,
            ],
        ]);
    }

    public function monthlySales(Request $request, int $year, int $month): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $sales = Sale::byBusiness($business->id)
            ->whereYear('sale_date', $year)
            ->whereMonth('sale_date', $month)
            ->get();

        $summary = [
            'total_sales' => $sales->count(),
            'total_amount' => $sales->sum('total_amount'),
            'average_sale' => $sales->count() > 0 ? $sales->sum('total_amount') / $sales->count() : 0,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'sales' => $sales,
                'summary' => $summary,
            ],
        ]);
    }

    private function getCurrentBusiness(): Business
    {
        $user = Auth::user();
        
        if ($user->isRoot()) {
            $businessId = request('business_id');
            if (!$businessId) {
                abort(400, 'business_id es requerido para usuarios root');
            }
            return Business::findOrFail($businessId);
        }
        
        return $user->business;
    }

    private function generateSaleNumber(Business $business): string
    {
        $lastSale = Sale::where('business_id', $business->id)
            ->whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        $number = $lastSale ? (int) substr($lastSale->sale_number, -3) + 1 : 1;
        
        return 'V-' . str_pad($number, 3, '0', STR_PAD_LEFT);
    }

    private function getCurrentCashRegisterId(Business $business): ?int
    {
        $openRegister = CashRegister::where('business_id', $business->id)
            ->where('status', 'open')
            ->first();
            
        return $openRegister?->id;
    }

    private function getItem(string $type, int $id)
    {
        if ($type === 'product') {
            return Product::findOrFail($id);
        }
        
        return Service::findOrFail($id);
    }
}
```

## 4. CashRegisterController

```php
<?php
// app/Http/Controllers/CashRegisterController.php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class CashRegisterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $query = CashRegister::with(['openedBy', 'closedBy'])
            ->byBusiness($business->id);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $registers = $query->latest('opened_at')->paginate($request->get('per_page', 15));
        
        return response()->json([
            'success' => true,
            'data' => $registers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        // Verificar que no haya una caja abierta
        $openRegister = CashRegister::where('business_id', $business->id)
            ->where('status', 'open')
            ->first();
            
        if ($openRegister) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe una caja registradora abierta',
            ], 400);
        }
        
        $request->validate([
            'initial_amount' => 'required|numeric|min:0',
            'currency' => 'required|in:PEN,USD',
            'notes' => 'nullable|string',
        ]);

        $cashRegister = CashRegister::create([
            'initial_amount' => $request->initial_amount,
            'currency' => $request->currency,
            'opened_at' => now(),
            'status' => 'open',
            'notes' => $request->notes,
            'business_id' => $business->id,
            'opened_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Caja registradora abierta exitosamente',
            'data' => $cashRegister->load('openedBy'),
        ], 201);
    }

    public function show(CashRegister $cashRegister): JsonResponse
    {
        $this->authorize('view', $cashRegister);
        
        $cashRegister->load(['openedBy', 'closedBy', 'sales']);

        return response()->json([
            'success' => true,
            'data' => $cashRegister,
        ]);
    }

    public function close(Request $request, CashRegister $cashRegister): JsonResponse
    {
        $this->authorize('update', $cashRegister);
        
        if ($cashRegister->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'La caja registradora ya está cerrada',
            ], 400);
        }
        
        $request->validate([
            'final_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $cashRegister->close(
            $request->final_amount,
            Auth::id(),
            $request->notes
        );

        return response()->json([
            'success' => true,
            'message' => 'Caja registradora cerrada exitosamente',
            'data' => $cashRegister->load(['openedBy', 'closedBy']),
        ]);
    }

    public function current(): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $cashRegister = CashRegister::with(['openedBy', 'sales'])
            ->where('business_id', $business->id)
            ->where('status', 'open')
            ->first();

        if (!$cashRegister) {
            return response()->json([
                'success' => false,
                'message' => 'No hay caja registradora abierta',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $cashRegister,
        ]);
    }

    public function report(CashRegister $cashRegister): JsonResponse
    {
        $this->authorize('view', $cashRegister);
        
        $sales = $cashRegister->sales()->with('items')->get();
        
        $report = [
            'cash_register' => $cashRegister,
            'sales_summary' => [
                'total_sales' => $sales->count(),
                'total_amount' => $sales->sum('total_amount'),
                'cash_sales' => $sales->where('payment_method', 'cash')->sum('total_amount'),
                'card_sales' => $sales->where('payment_method', 'card')->sum('total_amount'),
                'credit_sales' => $sales->where('payment_method', 'credit')->sum('total_amount'),
            ],
            'sales' => $sales,
            'products_sold' => $this->getProductsSold($sales),
        ];

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    private function getCurrentBusiness(): Business
    {
        $user = Auth::user();
        
        if ($user->isRoot()) {
            $businessId = request('business_id');
            if (!$businessId) {
                abort(400, 'business_id es requerido para usuarios root');
            }
            return Business::findOrFail($businessId);
        }
        
        return $user->business;
    }

    private function getProductsSold($sales)
    {
        $products = collect();
        
        foreach ($sales as $sale) {
            foreach ($sale->items as $item) {
                $existing = $products->firstWhere('name', $item->item_name);
                
                if ($existing) {
                    $existing['quantity'] += $item->quantity;
                    $existing['total'] += $item->total_price;
                } else {
                    $products->push([
                        'name' => $item->item_name,
                        'type' => $item->item_type,
                        'quantity' => $item->quantity,
                        'total' => $item->total_price,
                    ]);
                }
            }
        }
        
        return $products->sortByDesc('quantity')->values();
    }
}
```

## 5. CreditController

```php
<?php
// app/Http/Controllers/CreditController.php

namespace App\Http\Controllers;

use App\Models\Credit;
use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class CreditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $query = Credit::with(['sale', 'payments'])
            ->byBusiness($business->id);
        
        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('overdue') && $request->overdue) {
            $query->overdue();
        }
        
        $credits = $query->latest()->paginate($request->get('per_page', 15));
        
        return response()->json([
            'success' => true,
            'data' => $credits,
        ]);
    }

    public function show(Credit $credit): JsonResponse
    {
        $this->authorize('view', $credit);
        
        $credit->load(['sale.items', 'payments']);

        return response()->json([
            'success' => true,
            'data' => $credit,
        ]);
    }

    public function addPayment(Request $request, Credit $credit): JsonResponse
    {
        $this->authorize('update', $credit);
        
        $request->validate([
            'amount' => 'required|numeric|min:0.01|max:' . $credit->pending_amount,
            'payment_method' => 'required|in:cash,card,transfer',
            'notes' => 'nullable|string',
        ]);

        $payment = $credit->addPayment(
            $request->amount,
            $request->payment_method,
            $request->notes,
            Auth::id()
        );

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado exitosamente',
            'data' => [
                'payment' => $payment,
                'credit' => $credit->fresh(['payments']),
            ],
        ]);
    }

    public function pending(): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $credits = Credit::with(['sale'])
            ->byBusiness($business->id)
            ->pending()
            ->get();

        $summary = [
            'total_credits' => $credits->count(),
            'total_amount' => $credits->sum('pending_amount'),
            'overdue_count' => $credits->filter->isOverdue()->count(),
            'overdue_amount' => $credits->filter->isOverdue()->sum('pending_amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'credits' => $credits,
                'summary' => $summary,
            ],
        ]);
    }

    public function updateStatus(Credit $credit): JsonResponse
    {
        $this->authorize('update', $credit);
        
        $credit->updateStatus();

        return response()->json([
            'success' => true,
            'message' => 'Estado actualizado exitosamente',
            'data' => $credit,
        ]);
    }

    private function getCurrentBusiness(): Business
    {
        $user = Auth::user();
        
        if ($user->isRoot()) {
            $businessId = request('business_id');
            if (!$businessId) {
                abort(400, 'business_id es requerido para usuarios root');
            }
            return Business::findOrFail($businessId);
        }
        
        return $user->business;
    }
}
```

## 6. ExpenseController

```php
<?php
// app/Http/Controllers/ExpenseController.php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $query = Expense::with(['category', 'creator'])
            ->byBusiness($business->id);
        
        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('receipt_number', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        
        if ($request->has('date_from')) {
            $query->whereDate('expense_date', '>=', $request->date_from);
        }
        
        if ($request->has('date_to')) {
            $query->whereDate('expense_date', '<=', $request->date_to);
        }
        
        $expenses = $query->latest('expense_date')->paginate($request->get('per_page', 15));
        
        return response()->json([
            'success' => true,
            'data' => $expenses,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'receipt_number' => 'nullable|string|max:100',
            'category_id' => 'nullable|exists:categories,id',
            'notes' => 'nullable|string',
            'receipt' => 'nullable|image|mimes:jpeg,png,jpg,gif,pdf|max:5120',
        ]);

        $data = $request->except('receipt');
        $data['business_id'] = $business->id;
        $data['created_by'] = Auth::id();

        // Manejar recibo
        if ($request->hasFile('receipt')) {
            $receiptPath = $request->file('receipt')->store('receipts', 'public');
            $data['receipt_path'] = $receiptPath;
        }

        $expense = Expense::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Gasto registrado exitosamente',
            'data' => $expense->load(['category', 'creator']),
        ], 201);
    }

    public function show(Expense $expense): JsonResponse
    {
        $this->authorize('view', $expense);
        
        $expense->load(['category', 'creator']);

        return response()->json([
            'success' => true,
            'data' => $expense,
        ]);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $this->authorize('update', $expense);
        
        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'receipt_number' => 'nullable|string|max:100',
            'category_id' => 'nullable|exists:categories,id',
            'notes' => 'nullable|string',
            'receipt' => 'nullable|image|mimes:jpeg,png,jpg,gif,pdf|max:5120',
        ]);

        $data = $request->except('receipt');

        // Manejar recibo
        if ($request->hasFile('receipt')) {
            // Eliminar recibo anterior
            if ($expense->receipt_path) {
                Storage::disk('public')->delete($expense->receipt_path);
            }
            
            $receiptPath = $request->file('receipt')->store('receipts', 'public');
            $data['receipt_path'] = $receiptPath;
        }

        $expense->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Gasto actualizado exitosamente',
            'data' => $expense->load(['category', 'creator']),
        ]);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $this->authorize('delete', $expense);
        
        // Eliminar recibo
        if ($expense->receipt_path) {
            Storage::disk('public')->delete($expense->receipt_path);
        }
        
        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Gasto eliminado exitosamente',
        ]);
    }

    public function byCategory(int $categoryId): JsonResponse
    {
        $business = $this->getCurrentBusiness();
        
        $expenses = Expense::with(['creator'])
            ->byBusiness($business->id)
            ->byCategory($categoryId)
            ->latest('expense_date')
            ->get();

        $total = $expenses->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'expenses' => $expenses,
                'total' => $total,
            ],
        ]);
    }

    private function getCurrentBusiness(): Business
    {
        $user = Auth::user();
        
        if ($user->isRoot()) {
            $businessId = request('business_id');
            if (!$businessId) {
                abort(400, 'business_id es requerido para usuarios root');
            }
            return Business::findOrFail($businessId);
        }
        
        return $user->business;
    }
}
```