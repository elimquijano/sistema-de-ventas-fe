# Sistema de Almacenamiento de Archivos

## 1. Configuración de Storage

```php
<?php
// config/filesystems.php

'disks' => [
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app'),
        'throw' => false,
    ],

    'public' => [
        'driver' => 'local',
        'root' => storage_path('app/public'),
        'url' => env('APP_URL').'/storage',
        'visibility' => 'public',
        'throw' => false,
    ],

    // Para producción con S3
    's3' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
        'throw' => false,
    ],
],
```

## 2. FileController

```php
<?php
// app/Http/Controllers/FileController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;

class FileController extends Controller
{
    public function uploadProductImage(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            'business_id' => 'required|exists:businesses,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de imagen inválidos',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $image = $request->file('image');
            $businessId = $request->business_id;
            
            // Generar nombre único
            $filename = $this->generateUniqueFilename($image->getClientOriginalExtension());
            $path = "products/{$businessId}/{$filename}";
            
            // Redimensionar imagen
            $resizedImage = Image::make($image)
                ->resize(800, 600, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                })
                ->encode('jpg', 85);
            
            // Guardar imagen
            Storage::disk('public')->put($path, $resizedImage);
            
            // Crear thumbnail
            $thumbnailPath = "products/{$businessId}/thumbnails/{$filename}";
            $thumbnail = Image::make($image)
                ->resize(200, 150, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                })
                ->encode('jpg', 80);
            
            Storage::disk('public')->put($thumbnailPath, $thumbnail);

            return response()->json([
                'success' => true,
                'message' => 'Imagen subida exitosamente',
                'data' => [
                    'path' => $path,
                    'url' => Storage::url($path),
                    'thumbnail_path' => $thumbnailPath,
                    'thumbnail_url' => Storage::url($thumbnailPath),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al subir la imagen',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function uploadReceipt(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'receipt' => 'required|file|mimes:jpeg,png,jpg,gif,pdf|max:5120',
            'business_id' => 'required|exists:businesses,id',
            'expense_id' => 'nullable|exists:expenses,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo de recibo inválido',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $file = $request->file('receipt');
            $businessId = $request->business_id;
            $expenseId = $request->expense_id;
            
            // Generar nombre único
            $filename = $this->generateUniqueFilename($file->getClientOriginalExtension());
            $path = "receipts/{$businessId}/{$filename}";
            
            // Si es imagen, optimizar
            if (in_array($file->getClientOriginalExtension(), ['jpg', 'jpeg', 'png', 'gif'])) {
                $optimizedImage = Image::make($file)
                    ->resize(1200, null, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    })
                    ->encode('jpg', 85);
                
                Storage::disk('public')->put($path, $optimizedImage);
            } else {
                // Para PDFs, guardar directamente
                Storage::disk('public')->putFileAs(
                    "receipts/{$businessId}",
                    $file,
                    $filename
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Recibo subido exitosamente',
                'data' => [
                    'path' => $path,
                    'url' => Storage::url($path),
                    'filename' => $filename,
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al subir el recibo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function uploadBusinessLogo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:1024',
            'business_id' => 'required|exists:businesses,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Logo inválido',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $logo = $request->file('logo');
            $businessId = $request->business_id;
            
            // Eliminar logo anterior si existe
            $this->deleteOldBusinessLogo($businessId);
            
            $filename = "logo.{$logo->getClientOriginalExtension()}";
            $path = "businesses/{$businessId}/{$filename}";
            
            // Redimensionar logo
            $resizedLogo = Image::make($logo)
                ->resize(300, 300, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                })
                ->encode('png', 90);
            
            Storage::disk('public')->put($path, $resizedLogo);

            return response()->json([
                'success' => true,
                'message' => 'Logo subido exitosamente',
                'data' => [
                    'path' => $path,
                    'url' => Storage::url($path),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al subir el logo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function deleteFile(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Ruta de archivo inválida',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $path = $request->path;
            
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
                
                // Eliminar thumbnail si existe
                $thumbnailPath = str_replace('/products/', '/products/thumbnails/', $path);
                if (Storage::disk('public')->exists($thumbnailPath)) {
                    Storage::disk('public')->delete($thumbnailPath);
                }
                
                return response()->json([
                    'success' => true,
                    'message' => 'Archivo eliminado exitosamente',
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Archivo no encontrado',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el archivo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getFileInfo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Ruta de archivo inválida',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $path = $request->path;
            
            if (!Storage::disk('public')->exists($path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Archivo no encontrado',
                ], 404);
            }

            $size = Storage::disk('public')->size($path);
            $lastModified = Storage::disk('public')->lastModified($path);
            $mimeType = Storage::disk('public')->mimeType($path);

            return response()->json([
                'success' => true,
                'data' => [
                    'path' => $path,
                    'url' => Storage::url($path),
                    'size' => $size,
                    'size_human' => $this->formatBytes($size),
                    'mime_type' => $mimeType,
                    'last_modified' => date('Y-m-d H:i:s', $lastModified),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener información del archivo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function generateUniqueFilename(string $extension): string
    {
        return date('Y/m/d') . '/' . Str::uuid() . '.' . $extension;
    }

    private function deleteOldBusinessLogo(int $businessId): void
    {
        $logoExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
        
        foreach ($logoExtensions as $ext) {
            $path = "businesses/{$businessId}/logo.{$ext}";
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }

    private function formatBytes(int $size, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        
        return round($size, $precision) . ' ' . $units[$i];
    }
}
```

## 3. Trait para manejo de archivos en modelos

```php
<?php
// app/Traits/HasFiles.php

namespace App\Traits;

use Illuminate\Support\Facades\Storage;

trait HasFiles
{
    public function deleteFiles(): void
    {
        if (isset($this->fileFields)) {
            foreach ($this->fileFields as $field) {
                if ($this->$field) {
                    Storage::disk('public')->delete($this->$field);
                    
                    // Eliminar thumbnail si existe
                    $thumbnailPath = str_replace('/products/', '/products/thumbnails/', $this->$field);
                    if (Storage::disk('public')->exists($thumbnailPath)) {
                        Storage::disk('public')->delete($thumbnailPath);
                    }
                }
            }
        }
    }

    public function getFileUrl(string $field): ?string
    {
        if ($this->$field) {
            return Storage::url($this->$field);
        }
        
        return null;
    }

    public function getThumbnailUrl(string $field): ?string
    {
        if ($this->$field) {
            $thumbnailPath = str_replace('/products/', '/products/thumbnails/', $this->$field);
            if (Storage::disk('public')->exists($thumbnailPath)) {
                return Storage::url($thumbnailPath);
            }
        }
        
        return null;
    }

    protected static function bootHasFiles(): void
    {
        static::deleting(function ($model) {
            $model->deleteFiles();
        });
    }
}
```

## 4. Uso del trait en modelos

```php
<?php
// En el modelo Product

use App\Traits\HasFiles;

class Product extends Model
{
    use HasFiles;

    protected $fileFields = ['image_path'];

    // Accessor para URL de imagen
    public function getImageUrlAttribute(): ?string
    {
        return $this->getFileUrl('image_path');
    }

    // Accessor para URL de thumbnail
    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->getThumbnailUrl('image_path');
    }
}
```

```php
<?php
// En el modelo Expense

use App\Traits\HasFiles;

class Expense extends Model
{
    use HasFiles;

    protected $fileFields = ['receipt_path'];

    // Accessor para URL de recibo
    public function getReceiptUrlAttribute(): ?string
    {
        return $this->getFileUrl('receipt_path');
    }
}
```

## 5. Comando para limpiar archivos huérfanos

```php
<?php
// app/Console/Commands/CleanOrphanFiles.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use App\Models\Product;
use App\Models\Expense;

class CleanOrphanFiles extends Command
{
    protected $signature = 'files:clean-orphans';
    protected $description = 'Elimina archivos que no están referenciados en la base de datos';

    public function handle()
    {
        $this->info('Iniciando limpieza de archivos huérfanos...');

        $this->cleanProductImages();
        $this->cleanReceiptFiles();

        $this->info('Limpieza completada.');
    }

    private function cleanProductImages(): void
    {
        $this->info('Limpiando imágenes de productos...');

        $productPaths = Product::whereNotNull('image_path')->pluck('image_path')->toArray();
        $allProductFiles = Storage::disk('public')->allFiles('products');

        $orphanFiles = array_diff($allProductFiles, $productPaths);

        foreach ($orphanFiles as $file) {
            Storage::disk('public')->delete($file);
            $this->line("Eliminado: {$file}");
        }

        $this->info("Eliminadas " . count($orphanFiles) . " imágenes huérfanas de productos.");
    }

    private function cleanReceiptFiles(): void
    {
        $this->info('Limpiando archivos de recibos...');

        $receiptPaths = Expense::whereNotNull('receipt_path')->pluck('receipt_path')->toArray();
        $allReceiptFiles = Storage::disk('public')->allFiles('receipts');

        $orphanFiles = array_diff($allReceiptFiles, $receiptPaths);

        foreach ($orphanFiles as $file) {
            Storage::disk('public')->delete($file);
            $this->line("Eliminado: {$file}");
        }

        $this->info("Eliminados " . count($orphanFiles) . " archivos huérfanos de recibos.");
    }
}
```

## 6. Configuración para producción con S3

```php
<?php
// .env para producción

# Configuración de AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-bucket-name
AWS_URL=https://your-bucket-name.s3.amazonaws.com

# Usar S3 como disco por defecto en producción
FILESYSTEM_DISK=s3
```

## 7. Middleware para validar archivos

```php
<?php
// app/Http/Middleware/ValidateFileUpload.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ValidateFileUpload
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            
            // Validar tipo MIME real
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de archivo no permitido',
                ], 422);
            }
            
            // Validar tamaño
            if ($file->getSize() > 2048 * 1024) { // 2MB
                return response()->json([
                    'success' => false,
                    'message' => 'El archivo es demasiado grande',
                ], 422);
            }
        }

        return $next($request);
    }
}
```

## 8. Rutas para archivos

```php
// En routes/api.php

Route::middleware(['auth:sanctum'])->prefix('files')->group(function () {
    Route::post('upload/product-image', [FileController::class, 'uploadProductImage'])
        ->middleware('validate.file.upload');
    Route::post('upload/receipt', [FileController::class, 'uploadReceipt']);
    Route::post('upload/business-logo', [FileController::class, 'uploadBusinessLogo'])
        ->middleware('validate.file.upload');
    Route::delete('delete', [FileController::class, 'deleteFile']);
    Route::get('info', [FileController::class, 'getFileInfo']);
});
```