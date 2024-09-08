import { _decorator, Color, Component, gfx, MeshRenderer, Node, sys, tween, v3, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Utils')
export class Utils {
    public static lerp(start: number, end: number, t: number): number {
        return start + t * (end - start);
    }

    public static lerpVec3(start: Vec3, end: Vec3, t: number): Vec3 {
        return v3(Utils.lerp(start.x, end.x, t), Utils.lerp(start.y, end.y, t), Utils.lerp(start.z, end.z, t));
    }

    public static parabola(t: number, startY: number, endY: number, height: number): number {
        const peak = height + Math.max(startY, endY);
        const a = startY - 2 * peak + endY;
        const b = 2 * (peak - startY);
        const c = startY;
        return a * t ** 2 + b * t + c;
    }

    public static removeChildrenDestroy(node:Node) : void {
        // node.removeAllChildren();
        for (let index = node.children.length - 1; index >= 0; index--) {
            const element = node.children[index];
            element.removeFromParent();
            element.destroy();
        }
    }

    // http://yourdomain.com/playableAd/index.html?version=1
    public static getUrlParameter(name: string): string {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(window.location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    public static shuffleArray(array: number[]): number[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    }

    public static setMeshNodeAlpha(node: Node, alpha_0_1: number) {
        const meshRenderer = node.getComponent(MeshRenderer);
        if (meshRenderer)
            Utils.setMeshRendererAlpha(meshRenderer, alpha_0_1);
    }

    public static setMeshRendererAlpha(meshRenderer: MeshRenderer, alpha_0_1: number) {
        const material = meshRenderer.material;
        if (material) {
            // Ensure the material supports transparency
            material.setProperty('albedo', new Color(255, 255, 255, alpha_0_1 * 255));
            
            // If the material does not initially support transparency, you might need to adjust the blend state
            // const pass = material.passes[0];
            // const blendState = pass.blendState;
            // blendState.targets[0].blend = true;
            // blendState.targets[0].blendSrc = gfx.BlendFactor.SRC_ALPHA;
            // blendState.targets[0].blendDst = gfx.BlendFactor.ONE_MINUS_SRC_ALPHA;
            // blendState.targets[0].blendSrcAlpha = gfx.BlendFactor.SRC_ALPHA;
            // blendState.targets[0].blendDstAlpha = gfx.BlendFactor.ONE_MINUS_SRC_ALPHA;

            // Apply the modified material back to the mesh renderer
            // meshRenderer.material = material;
        }
    }

    public static isPointOnLineSegment(point: Vec3, start: Vec3, end: Vec3): boolean {
        const crossProduct = (point.y - start.y) * (end.z - start.z) - (point.z - start.z) * (end.y - start.y);
        if (Math.abs(crossProduct) > Number.EPSILON) return false;
    
        const dotProduct = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y) + (point.z - start.z) * (end.z - start.z);
        if (dotProduct < 0) return false;
    
        const squaredLength = (end.x - start.x) ** 2 + (end.y - start.y) ** 2 + (end.z - start.z) ** 2;
        if (dotProduct > squaredLength) return false;
        
        return true;
    }
    
    protected static _point:Vec3 = Vec3.ZERO.clone();
    protected static _start:Vec3 = Vec3.ZERO.clone();
    protected static _end:Vec3 = Vec3.ZERO.clone();

    // Helper function to calculate the distance from a point to a line segment
    public static distancePointToLineSegment(point: Vec3, start: Vec3, end: Vec3): number {
        const BA = point.clone().subtract(start);
        const BC = end.clone().subtract(start);
        
        const dotBA_BC = Vec3.dot(BA, BC);
        const dotBC_BC = Vec3.dot(BC, BC);
        
        const t = dotBA_BC / dotBC_BC;
        
        let closestPoint: Vec3;
        if (t < 0) {
            closestPoint = start; // Closest to B
        } else if (t > 1) {
            closestPoint = end; // Closest to C
        } else {
            closestPoint = start.clone().add(BC.multiplyScalar(t)); // Closest to segment
        }
        
        return Vec3.distance(point, closestPoint);

        // Utils._point.set(point);
        // Utils._start.set(start);
        // Utils._end.set(end);
        // const lineLengthSquared = Utils._start.subtract(Utils._end).lengthSqr();
        // if (lineLengthSquared === 0) return Utils._point.subtract(Utils._start).length();
    
        // const t = Math.max(0, Math.min(1, Utils._point.subtract(Utils._start).dot(Utils._end.subtract(Utils._start)) / lineLengthSquared));
        // const projection = Utils._start.add(Utils._end.subtract(Utils._start).multiplyScalar(t));
        // return Utils._point.subtract(projection).length();
    }
    
    public static isTouchDevice() {
        return sys.hasFeature(sys.Feature.INPUT_TOUCH);
    }

    public static isPointInPolygon(P: Vec3, polygon: Vec3[]): boolean {
        let intersectCount = 0;

        for (let i = 0; i < polygon.length; i++) {
            const A = polygon[i];
            const B = polygon[(i + 1) % polygon.length];

            // Check if the ray starting from P intersects with the edge AB
            if (Utils.rayIntersectsSegment(P, A, B)) {
                intersectCount++;
            }
        }

        // If the number of intersections is odd, the point is inside
        return intersectCount % 2 === 1;
    }

    // Function to check if a point P is on the line segment AB
    public static isPointOnSegment(A: Vec3, B: Vec3, P: Vec3): boolean {
        const crossProduct = (P.y - A.y) * (B.x - A.x) - (P.x - A.x) * (B.y - A.y);
        if (Math.abs(crossProduct) > Number.EPSILON) {
          return false;
        }
      
        const dotProduct = (P.x - A.x) * (B.x - A.x) + (P.y - A.y) * (B.y - A.y);
        if (dotProduct < 0) {
          return false;
        }
      
        const squaredLengthBA = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
        if (dotProduct > squaredLengthBA) {
          return false;
        }
      
        return true;
    }
      
    // Function to check if a ray starting from point P intersects the segment AB
    public static rayIntersectsSegment(P, A, B) {
        if (A.y > B.y) {
            [A, B] = [B, A];
        }
      
        // Check if point is out of bounds
        if (P.y < A.y || P.y > B.y) {
            return false;
        }
      
        // If the point is to the left of both A and B, it definitely intersects
        if (P.x < Math.min(A.x, B.x)) {
            return true;
        }
      
        // If the point is to the right of both A and B, it definitely does not intersect
        if (P.x >= Math.max(A.x, B.x)) {
            return false;
        }
      
        // Calculate the intersection point on the x-axis using the slope
        const slope = (B.x - A.x) / (B.y - A.y);
        const xIntersect = A.x + (P.y - A.y) * slope;
      
        return P.x < xIntersect;
    }
    
    public static calculatePolygonAreaXZ(vertices: Vec3[]): number {
        let area = 0;
        const n = vertices.length;
    
        for (let i = 0; i < n; i++) {
            const current = vertices[i];
            const next = vertices[(i + 1) % n];
    
            area += current.x * next.z - current.z * next.x;
        }
    
        return Math.abs(area) / 2;
    }

    protected static orientation(p:Vec2, q:Vec2, r:Vec2) : number {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (val === 0) return 0;  // collinear
        return (val > 0) ? 1 : 2; // clock or counterclock wise
    }
    protected static onSegment(p:Vec2, q:Vec2, r:Vec2) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
                q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    }
    
    public static doIntersect(p1:Vec2, q1:Vec2, p2:Vec2, q2:Vec2) : boolean {
        const o1 = Utils.orientation(p1, q1, p2);
        const o2 = Utils.orientation(p1, q1, q2);
        const o3 = Utils.orientation(p2, q2, p1);
        const o4 = Utils.orientation(p2, q2, q1);
    
        // General case
        if (o1 !== o2 && o3 !== o4) return true;
    
        // Special cases (collinear cases)
        if (o1 === 0 && Utils.onSegment(p1, p2, q1)) return true;
        if (o2 === 0 && Utils.onSegment(p1, q2, q1)) return true;
        if (o3 === 0 && Utils.onSegment(p2, p1, q2)) return true;
        if (o4 === 0 && Utils.onSegment(p2, q1, q2)) return true;
    
        return false;
    }
}
