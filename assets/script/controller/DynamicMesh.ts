import { _decorator, Component, MeshRenderer, Mesh, utils, primitives, Color, Vec3, MeshCollider } from 'cc';
import { CSG } from '../util/CSG';
const { ccclass, property } = _decorator;

@ccclass('DynamicMesh')
export class DynamicMesh extends Component {
    private meshRenderer: MeshRenderer | null = null;
    private meshCollider: MeshCollider = null;
    private mesh: Mesh | null = null;

    start() {
        this.meshRenderer = this.node.getComponent(MeshRenderer);
        this.meshCollider = this.node.getComponent(MeshCollider);
        this.createMesh();
    }

    createMesh() {
        const yTop = 1, yBottom = -1;//[x,z,...]
        var polyBox = CSG.polyBox(3, [0.25,0.25,2,-0.25,2,-2,-2,-2,-2,0,-0.25,0.25], false);
        var cube = CSG.cube({center:[-1, 0, 0], radius:2});
        // var org = CSG.fromMesh(this.meshRenderer.mesh);
        var cube_small = CSG.cube({ radius: [1, 1, 3] });
        // var sphere = CSG.sphere({ radius: 2 });
        // this.mesh = CSG.toMesh(sphere.subtract(org));
        // this.mesh = CSG.toMesh(sphere.subtract(cube_small));
        // this.mesh = CSG.toMesh(polyBox);
        this.mesh = CSG.toMesh(cube.subtract(cube_small));
        // this.mesh = CSG.toMesh(CSG.cube({ radius: [4, 5, 8] }));

        if (this.meshRenderer && this.mesh) {
            this.meshRenderer.mesh = this.mesh;
            this.meshCollider.mesh = this.mesh;
        }
    }
}
