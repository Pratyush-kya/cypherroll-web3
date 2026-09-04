import bpy
import os
import math

output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "assets", "3d"))
os.makedirs(output_dir, exist_ok=True)

blend_file_path = os.path.join(output_dir, "cypherroll_showcase.blend")
home_blend_path = os.path.expanduser("~/cypherroll_showcase.blend")

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, metallic=0.9, roughness=0.2, emission_color=(0,0,0,1), emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emission_color
            bsdf.inputs['Emission Strength'].default_value = emission_strength
        elif 'Emission' in bsdf.inputs:
            bsdf.inputs['Emission'].default_value = emission_color
    return mat

def build_impressive_dice():
    print("Designing High-Detail Cyberpunk Dice...")
    # Base cube
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(-3.5, 0, 1.0))
    dice = bpy.context.active_object
    dice.name = "CypherDice_Master"
    
    # Bevel modifier for rounded edges
    bevel = dice.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.18
    bevel.segments = 6
    bpy.ops.object.modifier_apply(modifier="Bevel")
    bpy.ops.object.shade_smooth()
    
    # Obsidian Metallic Material
    body_mat = create_pbr_material("ObsidianHull", (0.04, 0.06, 0.12, 1.0), metallic=0.95, roughness=0.12)
    # Glowing Amber Gold Pip Material
    gold_mat = create_pbr_material("NeonAmberPip", (0.98, 0.64, 0.08, 1.0), metallic=0.85, roughness=0.1,
                                   emission_color=(0.98, 0.64, 0.08, 1.0), emission_strength=8.0)
    # Glowing Cyan Accent Lines
    cyan_mat = create_pbr_material("NeonCyanCircuit", (0.05, 0.85, 0.95, 1.0), metallic=0.5, roughness=0.2,
                                   emission_color=(0.05, 0.85, 0.95, 1.0), emission_strength=10.0)

    dice.data.materials.append(body_mat)
    dice.data.materials.append(gold_mat)
    dice.data.materials.append(cyan_mat)
    
    # Add pip spheres on 6 faces
    pips = [
        # Face 1 (+Z)
        (0, 0, 1.02),
        # Face 6 (-Z)
        (-0.5, -0.5, -1.02), (-0.5, 0, -1.02), (-0.5, 0.5, -1.02),
        (0.5, -0.5, -1.02), (0.5, 0, -1.02), (0.5, 0.5, -1.02),
        # Face 2 (-Y)
        (-0.45, -1.02, -0.45), (0.45, -1.02, 0.45),
        # Face 5 (+Y)
        (-0.45, 1.02, -0.45), (0.45, 1.02, -0.45), (0, 1.02, 0), (-0.45, 1.02, 0.45), (0.45, 1.02, -0.45),
        # Face 3 (+X)
        (1.02, -0.45, -0.45), (1.02, 0, 0), (1.02, 0.45, 0.45),
        # Face 4 (-X)
        (-1.02, -0.45, -0.45), (-1.02, -0.45, 0.45), (-1.02, 0.45, -0.45), (-1.02, 0.45, 0.45)
    ]
    
    for i, pos in enumerate(pips):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.14, location=(pos[0] - 3.5, pos[1], pos[2] + 1.0))
        pip = bpy.context.active_object
        pip.name = f"DicePip_{i}"
        pip.data.materials.append(gold_mat)
        pip.parent = dice

    # Export dice individually
    bpy.ops.object.select_all(action='DESELECT')
    dice.select_set(True)
    for child in dice.children:
        child.select_set(True)
    dice_out = os.path.join(output_dir, "dice.glb")
    bpy.ops.export_scene.gltf(filepath=dice_out, export_format='GLB', use_selection=True)
    print(f"Exported Dice GLB: {dice_out}")
    return dice

def build_impressive_rocket():
    print("Designing High-Detail Cyberpunk Rocket...")
    # Main Fuselage
    bpy.ops.mesh.primitive_cylinder_add(radius=0.65, depth=3.0, vertices=32, location=(0, 0, 1.8))
    body = bpy.context.active_object
    body.name = "CypherRocket_Master"
    
    # Aerodynamic Nose Cone
    bpy.ops.mesh.primitive_cone_add(radius1=0.65, depth=1.5, vertices=32, location=(0, 0, 4.05))
    nose = bpy.context.active_object
    nose.name = "RocketCockpitNose"
    
    # Materials
    hull_mat = create_pbr_material("RocketTitanium", (0.08, 0.11, 0.18, 1.0), metallic=0.92, roughness=0.18)
    purple_mat = create_pbr_material("NeonVioletAccent", (0.58, 0.36, 0.98, 1.0), metallic=0.8, roughness=0.15,
                                     emission_color=(0.58, 0.36, 0.98, 1.0), emission_strength=8.0)
    flame_mat = create_pbr_material("HyperThrusterPlasma", (1.0, 0.45, 0.05, 1.0), metallic=0.1, roughness=0.1,
                                    emission_color=(1.0, 0.5, 0.1, 1.0), emission_strength=18.0)
    
    body.data.materials.append(hull_mat)
    nose.data.materials.append(purple_mat)
    nose.parent = body
    
    # Engine Nozzle
    bpy.ops.mesh.primitive_cone_add(radius1=0.55, radius2=0.35, depth=0.7, vertices=32, location=(0, 0, 0.0))
    nozzle = bpy.context.active_object
    nozzle.data.materials.append(hull_mat)
    nozzle.parent = body
    
    # Luminous Thruster Flame
    bpy.ops.mesh.primitive_cone_add(radius1=0.45, radius2=0.05, depth=1.8, vertices=32, location=(0, 0, -1.1))
    flame = bpy.context.active_object
    flame.data.materials.append(flame_mat)
    flame.parent = body
    
    # 4 Aerodynamic Stabilizer Fins
    for angle in [0, math.pi/2, math.pi, 3*math.pi/2]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
        fin = bpy.context.active_object
        fin.scale = (0.06, 0.5, 0.7)
        fin.location = (math.cos(angle) * 0.85, math.sin(angle) * 0.85, 0.7)
        fin.rotation_euler = (0, 0, angle)
        fin.data.materials.append(purple_mat)
        fin.parent = body
    
    # Center origin
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    for child in body.children:
        child.select_set(True)
    rocket_out = os.path.join(output_dir, "rocket.glb")
    bpy.ops.export_scene.gltf(filepath=rocket_out, export_format='GLB', use_selection=True)
    print(f"Exported Rocket GLB: {rocket_out}")
    return body

def build_impressive_chip():
    print("Designing High-Detail Casino Chip...")
    bpy.ops.mesh.primitive_cylinder_add(radius=1.3, depth=0.25, vertices=64, location=(3.5, 0, 1.0))
    chip = bpy.context.active_object
    chip.name = "CypherChip_Master"
    
    bevel = chip.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.05
    bevel.segments = 4
    bpy.ops.object.modifier_apply(modifier="Bevel")
    bpy.ops.object.shade_smooth()
    
    gold_mat = create_pbr_material("LuxuryGold", (0.98, 0.68, 0.12, 1.0), metallic=0.96, roughness=0.1)
    purple_mat = create_pbr_material("ChipNeonCore", (0.58, 0.36, 0.98, 1.0), metallic=0.7, roughness=0.2,
                                     emission_color=(0.58, 0.36, 0.98, 1.0), emission_strength=7.0)
    
    chip.data.materials.append(gold_mat)
    
    # Center holographic ring
    bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.06, location=(3.5, 0, 1.13))
    ring = bpy.context.active_object
    ring.data.materials.append(purple_mat)
    ring.parent = chip
    
    bpy.ops.object.select_all(action='DESELECT')
    chip.select_set(True)
    ring.select_set(True)
    chip_out = os.path.join(output_dir, "chip.glb")
    bpy.ops.export_scene.gltf(filepath=chip_out, export_format='GLB', use_selection=True)
    print(f"Exported Chip GLB: {chip_out}")
    return chip

def setup_studio_environment():
    print("Configuring Studio Lighting & Camera...")
    # Add Camera
    bpy.ops.object.camera_add(location=(0, -7.5, 3.2), rotation=(math.radians(72), 0, 0))
    camera = bpy.context.active_object
    camera.name = "CasinoStudioCamera"
    bpy.context.scene.camera = camera
    
    # Key Light (Gold Amber)
    bpy.ops.object.light_add(type='AREA', location=(-4, -4, 5))
    key_light = bpy.context.active_object
    key_light.data.energy = 800
    key_light.data.color = (0.98, 0.65, 0.1)
    
    # Rim Light (Cyberpunk Violet)
    bpy.ops.object.light_add(type='AREA', location=(4, -3, 4))
    rim_light = bpy.context.active_object
    rim_light.data.energy = 1000
    rim_light.data.color = (0.58, 0.36, 0.98)
    
    # Fill Light (Deep Cyan)
    bpy.ops.object.light_add(type='POINT', location=(0, 4, 3))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 400
    fill_light.data.color = (0.05, 0.85, 0.95)

if __name__ == "__main__":
    clear_scene()
    build_impressive_dice()
    build_impressive_rocket()
    build_impressive_chip()
    setup_studio_environment()
    
    # Save .blend files for GUI inspection
    bpy.ops.wm.save_as_mainfile(filepath=blend_file_path)
    bpy.ops.wm.save_as_mainfile(filepath=home_blend_path)
    print(f"Saved complete Blender Scene to:\n  1. {blend_file_path}\n  2. {home_blend_path}")
    print("Done! You can now open Blender directly to view and edit all 3D assets in full GUI!")
