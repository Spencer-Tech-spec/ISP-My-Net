from PIL import Image, ImageDraw

def create_wifi_icon(size=1024):
    # Create a transparent image
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Background Circle (Vibrant Blue)
    circle_margin = 20
    draw.ellipse([circle_margin, circle_margin, size - circle_margin, size - circle_margin], fill='#007BFF')
    
    # WiFi Symbol (White)
    center = size // 2
    # Bottom dot
    dot_y = size * 0.75
    dot_radius = size * 0.08
    draw.ellipse([center - dot_radius, dot_y - dot_radius, center + dot_radius, dot_y + dot_radius], fill='white')
    
    # Arcs
    stroke_width = size // 15
    arc_colors = 'white'
    
    # Three concentric arcs
    for i in range(1, 4):
        radius = dot_radius + (i * size * 0.15)
        bbox = [center - radius, dot_y - radius, center + radius, dot_y + radius]
        # Draw arc from -135 to -45 degrees (pointing up)
        draw.arc(bbox, start=225, end=315, fill=arc_colors, width=stroke_width)

    # Save as icon.png and adaptive-icon.png
    image.save('assets/icon.png')
    # Adaptive icon usually needs more padding or a specific background, 
    # but for now we'll use the same high-res png.
    image.save('assets/adaptive-icon.png')
    print("Icons generated successfully in assets folder.")

if __name__ == "__main__":
    create_wifi_icon()
