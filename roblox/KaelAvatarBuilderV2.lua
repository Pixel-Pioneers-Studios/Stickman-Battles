-- KaelAvatarBuilderV2.lua
-- Roblox Studio Command Bar builder for Kael, the 95th Fragment Bearer.
-- Rounded capsule stickman pass: blue body, curved hands/feet, integrated Fragment.

local Workspace = game:GetService("Workspace")
local MODEL_NAME = "Kael_95thBearer"
local old = Workspace:FindFirstChild(MODEL_NAME)
if old then old:Destroy() end

local C = {
 Blue = Color3.fromRGB(68,136,255), BlueDark = Color3.fromRGB(24,58,142), BlueLight = Color3.fromRGB(118,190,255),
 Fragment = Color3.fromRGB(136,221,255), FragmentCore = Color3.fromRGB(232,252,255),
 Void = Color3.fromRGB(136,68,255), Paradox = Color3.fromRGB(255,68,204), White = Color3.fromRGB(245,250,255)
}

local model = Instance.new("Model")
model.Name = MODEL_NAME
model:SetAttribute("Character", "Kael")
model:SetAttribute("Lore", "95th Fragment Bearer")
model:SetAttribute("FragmentState", "Fully integrated")
model:SetAttribute("BodyColor", "Kael Blue #4488FF")
model:SetAttribute("DesignNote", "Rounded capsule stickman; blue identity; integrated cyan Fragment; restrained Paradox echo")
model.Parent = Workspace

local function makePart(name,size,cf,color,material,parent)
 local p=Instance.new("Part"); p.Name=name; p.Size=size; p.CFrame=cf; p.Color=color; p.Material=material or Enum.Material.SmoothPlastic
 p.Anchored=false; p.CanCollide=false; p.CanTouch=false; p.CanQuery=false; p.CastShadow=true
 p.TopSurface=Enum.SurfaceType.Smooth; p.BottomSurface=Enum.SurfaceType.Smooth; p.Parent=parent or model; return p
end
local function weld(root,child) local w=Instance.new("WeldConstraint"); w.Part0=root; w.Part1=child; w.Parent=child end
local function light(parent,color,brightness,range) local l=Instance.new("PointLight"); l.Color=color; l.Brightness=brightness; l.Range=range; l.Shadows=false; l.Parent=parent end
local function sphere(name,diameter,pos,color,material,parent)
 local p=makePart(name,Vector3.new(diameter,diameter,diameter),CFrame.new(pos),color,material,parent); p.Shape=Enum.PartType.Ball; return p
end
local function capsule(name,a,b,radius,color,material,parent)
 local mid=(a+b)/2; local length=(b-a).Magnitude; local cf=CFrame.lookAt(mid,b)*CFrame.Angles(math.rad(90),0,0)
 local body=makePart(name,Vector3.new(radius*2,length,radius*2),cf,color,material,parent); body.Shape=Enum.PartType.Cylinder
 sphere(name.."_CapA",radius*2,a,color,material,parent); sphere(name.."_CapB",radius*2,b,color,material,parent); return body
end

local root=makePart("HumanoidRootPart",Vector3.new(1,1,1),CFrame.new(0,4.3,0),C.Blue,Enum.Material.SmoothPlastic)
root.Transparency=1; model.PrimaryPart=root

-- Rounded stickman body: capsules everywhere, never box limbs.
capsule("Torso",Vector3.new(0,4.45,0),Vector3.new(0,6.05,0),0.48,C.Blue,Enum.Material.SmoothPlastic)
sphere("Head",1.16,Vector3.new(0,6.85,0),C.Blue,Enum.Material.SmoothPlastic)
capsule("Neck",Vector3.new(0,6.15,0),Vector3.new(0,6.35,0),0.19,C.BlueDark,Enum.Material.SmoothPlastic)

capsule("LeftUpperArm",Vector3.new(-0.39,5.82,0),Vector3.new(-0.82,5.12,0),0.18,C.Blue,Enum.Material.SmoothPlastic)
capsule("LeftForearm",Vector3.new(-0.82,5.12,0),Vector3.new(-1.02,4.50,0),0.16,C.Blue,Enum.Material.SmoothPlastic)
capsule("RightUpperArm",Vector3.new(0.39,5.82,0),Vector3.new(0.82,5.12,0),0.18,C.Blue,Enum.Material.SmoothPlastic)
capsule("RightForearm",Vector3.new(0.82,5.12,0),Vector3.new(1.02,4.50,0),0.16,C.Blue,Enum.Material.SmoothPlastic)
sphere("LeftHand",0.38,Vector3.new(-1.02,4.35,0),C.BlueLight,Enum.Material.SmoothPlastic)
sphere("RightHand",0.38,Vector3.new(1.02,4.35,0),C.BlueLight,Enum.Material.SmoothPlastic)

capsule("LeftThigh",Vector3.new(-0.22,4.25,0),Vector3.new(-0.36,3.15,0),0.22,C.Blue,Enum.Material.SmoothPlastic)
capsule("LeftShin",Vector3.new(-0.36,3.15,0),Vector3.new(-0.43,2.08,0),0.19,C.Blue,Enum.Material.SmoothPlastic)
capsule("RightThigh",Vector3.new(0.22,4.25,0),Vector3.new(0.36,3.15,0),0.22,C.Blue,Enum.Material.SmoothPlastic)
capsule("RightShin",Vector3.new(0.36,3.15,0),Vector3.new(0.43,2.08,0),0.19,C.Blue,Enum.Material.SmoothPlastic)
-- Horizontal foot capsules create the curved bottoms rather than flat blocks.
capsule("LeftFoot",Vector3.new(-0.43,1.88,-0.18),Vector3.new(-0.43,1.88,-0.66),0.24,C.BlueDark,Enum.Material.SmoothPlastic)
capsule("RightFoot",Vector3.new(0.43,1.88,-0.18),Vector3.new(0.43,1.88,-0.66),0.24,C.BlueDark,Enum.Material.SmoothPlastic)

-- Integrated Fragment: bright cyan crystal embedded in Kael's blue body.
local fragment=makePart("Fragment_ChestCore",Vector3.new(0.42,0.72,0.18),CFrame.new(0,5.47,-0.47)*CFrame.Angles(0,0,math.rad(18)),C.Fragment,Enum.Material.Neon)
fragment.Shape=Enum.PartType.Wedge; fragment.Transparency=0.04; light(fragment,C.Fragment,2.6,9)
local core=makePart("Fragment_InnerCore",Vector3.new(0.12,0.45,0.06),CFrame.new(0,5.48,-0.57)*CFrame.Angles(0,0,math.rad(18)),C.FragmentCore,Enum.Material.Neon)
light(core,C.FragmentCore,1.4,5)
makePart("Fragment_CrackL",Vector3.new(0.035,0.55,0.035),CFrame.new(-0.18,5.50,-0.50)*CFrame.Angles(0,0,math.rad(-32)),C.Fragment,Enum.Material.Neon)
makePart("Fragment_CrackR",Vector3.new(0.035,0.45,0.035),CFrame.new(0.20,5.38,-0.50)*CFrame.Angles(0,0,math.rad(38)),C.Fragment,Enum.Material.Neon)

local mark=makePart("IdentityMark",Vector3.new(0.05,0.18,0.46),CFrame.new(0.30,6.88,-0.54)*CFrame.Angles(0,0,math.rad(-28)),C.White,Enum.Material.Neon)
light(mark,C.Fragment,0.25,3)
local echo=makePart("ParadoxEcho",Vector3.new(0.06,0.70,0.06),CFrame.new(0,5.55,0.47)*CFrame.Angles(0,0,math.rad(-18)),C.Void,Enum.Material.Neon)
echo.Transparency=0.25; light(echo,C.Void,0.6,4)

local orbit=Instance.new("Folder"); orbit.Name="FragmentShardOrbit"; orbit.Parent=model
local shards={{"FragmentShard_A",Vector3.new(-0.82,6.18,-0.20),C.Fragment},{"FragmentShard_B",Vector3.new(0.78,5.72,-0.12),C.Fragment},{"FragmentShard_C",Vector3.new(-0.64,4.72,-0.10),C.Fragment},{"ParadoxEchoShard",Vector3.new(0.90,5.25,0.20),C.Paradox}}
for _,d in ipairs(shards) do
 local s=makePart(d[1],Vector3.new(0.10,0.30,0.10),CFrame.new(d[2])*CFrame.Angles(0,0,math.rad(28)),d[3],Enum.Material.Neon,orbit); s.Transparency=0.14; light(s,d[3],0.7,3)
end

for _,item in ipairs(model:GetDescendants()) do if item:IsA("BasePart") and item~=root then weld(root,item) end end
local humanoid=Instance.new("Humanoid"); humanoid.DisplayName="Kael • 95th Fragment Bearer"; humanoid.HealthDisplayType=Enum.HumanoidHealthDisplayType.AlwaysOff; humanoid.NameDisplayDistance=0; humanoid.Parent=model
local highlight=Instance.new("Highlight"); highlight.Name="FragmentResonanceHighlight"; highlight.FillColor=C.Fragment; highlight.OutlineColor=C.Void; highlight.FillTransparency=1; highlight.OutlineTransparency=0.75; highlight.DepthMode=Enum.HighlightDepthMode.Occluded; highlight.Parent=model
print("Kael v2 created: "..model:GetFullName()); print("Blue capsule stickman / integrated cyan Fragment / restrained Paradox echo")
