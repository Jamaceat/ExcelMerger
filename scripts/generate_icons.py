import os
from PIL import Image, ImageOps

def create_icon_variants():
    source_path = 'assets/appicon/IconoApp.png'
    output_dir = 'assets/images'
    
    if not os.path.exists(source_path):
        print(f"Error: No se encontró el archivo origen en {source_path}")
        return
        
    os.makedirs(output_dir, exist_ok=True)
    
    # Abrir la imagen original
    img = Image.open(source_path).convert("RGBA")
    src_w, src_h = img.size
    
    # 1. assets/images/icon.png (1024x1024)
    # Ajustamos la imagen original para que ocupe el 85% del ancho del lienzo (1024px)
    target_w = int(1024 * 0.85)
    target_h = int(target_w * (src_h / src_w))
    resized_img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    canvas_icon = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    offset_x = (1024 - target_w) // 2
    offset_y = (1024 - target_h) // 2
    canvas_icon.paste(resized_img, (offset_x, offset_y), resized_img)
    canvas_icon.save(os.path.join(output_dir, 'icon.png'), 'PNG')
    print("Creado: icon.png")
    
    # 2. assets/images/android-icon-foreground.png (1024x1024)
    # Para iconos adaptativos, el frente debe estar dentro de la zona segura del 66% (aprox 60% del ancho)
    fg_w = int(1024 * 0.60)
    fg_h = int(fg_w * (src_h / src_w))
    resized_fg = img.resize((fg_w, fg_h), Image.Resampling.LANCZOS)
    
    canvas_fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    offset_x_fg = (1024 - fg_w) // 2
    offset_y_fg = (1024 - fg_h) // 2
    canvas_fg.paste(resized_fg, (offset_x_fg, offset_y_fg), resized_fg)
    canvas_fg.save(os.path.join(output_dir, 'android-icon-foreground.png'), 'PNG')
    print("Creado: android-icon-foreground.png")
    
    # 3. assets/images/android-icon-background.png (1024x1024)
    # Fondo adaptativo de color sólido (#E6F4FE)
    bg_color = (230, 244, 254, 255) # #E6F4FE
    canvas_bg = Image.new("RGBA", (1024, 1024), bg_color)
    canvas_bg.save(os.path.join(output_dir, 'android-icon-background.png'), 'PNG')
    print("Creado: android-icon-background.png")
    
    # 4. assets/images/android-icon-monochrome.png (1024x1024)
    # Para iconos monocromáticos (Android 13+), debe ser la silueta en escala de grises con transparencia.
    r, g, b, alpha = resized_fg.split()
    gray_fg = ImageOps.grayscale(resized_fg)
    # Recombinar usando el canal alfa original para mantener la transparencia
    monochrome_fg = Image.merge("LA", (gray_fg, alpha)).convert("RGBA")
    
    canvas_mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    canvas_mono.paste(monochrome_fg, (offset_x_fg, offset_y_fg), monochrome_fg)
    canvas_mono.save(os.path.join(output_dir, 'android-icon-monochrome.png'), 'PNG')
    print("Creado: android-icon-monochrome.png")
    
    # 5. assets/images/favicon.png (48x48)
    fav_w = int(48 * 0.85)
    fav_h = int(fav_w * (src_h / src_w))
    resized_fav = img.resize((fav_w, fav_h), Image.Resampling.LANCZOS)
    
    canvas_fav = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    offset_x_fav = (48 - fav_w) // 2
    offset_y_fav = (48 - fav_h) // 2
    canvas_fav.paste(resized_fav, (offset_x_fav, offset_y_fav), resized_fav)
    canvas_fav.save(os.path.join(output_dir, 'favicon.png'), 'PNG')
    print("Creado: favicon.png")
    
    # 6. assets/images/splash-icon.png (512x512)
    splash_w = int(512 * 0.60)
    splash_h = int(splash_w * (src_h / src_w))
    resized_splash = img.resize((splash_w, splash_h), Image.Resampling.LANCZOS)
    
    canvas_splash = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    offset_x_splash = (512 - splash_w) // 2
    offset_y_splash = (512 - splash_h) // 2
    canvas_splash.paste(resized_splash, (offset_x_splash, offset_y_splash), resized_splash)
    canvas_splash.save(os.path.join(output_dir, 'splash-icon.png'), 'PNG')
    print("Creado: splash-icon.png")

if __name__ == '__main__':
    create_icon_variants()
