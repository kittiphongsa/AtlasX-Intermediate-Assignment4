/*
  Copyright 2019 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  Attribute
} from "@angular/core";
import { loadModules } from "esri-loader";
import esri = __esri; // Esri TypeScript Types

import { GeometryService } from '../services/geometry.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: "app-esri-map",
  templateUrl: "./esri-map.component.html",
  styleUrls: ["./esri-map.component.scss"]
})
export class EsriMapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  // The <div> where we will place the map
  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  /**
   * _zoom sets map zoom
   * _center sets map center
   * _basemap sets type of map
   * _loaded provides map loaded status
   */
  private _zoom = 10;
  private _center: Array<number> = [0.1278, 51.5074];
  private _basemap = "streets";
  private _loaded = false;
  private _view: esri.MapView = null;
  private _graphicsLayer: esri.GraphicsLayer = null;

  get mapLoaded(): boolean {
    return this._loaded;
  }

  @Input()
  set zoom(zoom: number) {
    this._zoom = zoom;
  }

  get zoom(): number {
    return this._zoom;
  }

  @Input()
  set center(center: Array<number>) {
    this._center = center;
  }

  get center(): Array<number> {
    return this._center;
  }

  @Input()
  set basemap(basemap: string) {
    this._basemap = basemap;
  }

  get basemap(): string {
    return this._basemap;
  }

  constructor(private geometryService: GeometryService, private apiService: ApiService) {}

  async initializeMap() {
    try {

      // Load the modules for the ArcGIS API for JavaScript
      const [Map, MapView, GraphicsLayer] = await loadModules([
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/GraphicsLayer",
      ]);

      // Configure the Map
      const mapProperties: esri.MapProperties = {
        basemap: this._basemap
      };

      const map: esri.Map = new Map(mapProperties);

      // Create blank graphic layer
      const graphicsLayer = new GraphicsLayer();
      this._graphicsLayer = graphicsLayer;

      // Add graphic layer to map
      map.add(graphicsLayer);

      // Initialize the MapView
      const mapViewProperties: esri.MapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this._center,
        zoom: this._zoom,
        map: map
      };

      this._view = new MapView(mapViewProperties);
      await this._view.when();
      return this._view;
    } catch (error) {
      console.log("EsriLoader: ", error);
    }
  }

  async setPolygonGraphic(rings: Array<any>){

    try {

      const [Graphic, Polygon] = await loadModules([
        "esri/Graphic",
        "esri/geometry/Polygon"
      ]);

      const polygon = {
        type: "polygon", // autocasts as new Polygon()
        rings: rings
      };

      // Create a symbol for rendering the graphic
      const fillSymbol = {
        type: "simple-fill", // autocasts as new SimpleFillSymbol()
        color: [227, 139, 79, 0.8],
        outline: {
          // autocasts as new SimpleLineSymbol()
          color: [255, 255, 255],
          width: 1
        }
      };

      // Add the geometry and symbol to a new graphic
      const polygonGraphic = new Graphic({
        geometry: polygon,
        symbol: fillSymbol
      });

      this._graphicsLayer.removeAll();
      this._graphicsLayer.add(polygonGraphic);

      // Find a centroid of polygon and move the map

      const polygonObject = new Polygon({
        rings: rings
      });

      this._view.goTo([polygonObject.centroid]);

    } catch (error) {
      console.log("EsriLoader: ", error);
    }

  }

  async print(feature: any){

    try {

      const [PrintTask] = await loadModules([
        "esri/tasks/PrintTask"
      ]);

      const printTask = new PrintTask({
        url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
      });

      this.setPolygonGraphic(feature.geometry.rings);

      printTask.execute({
        view: this._view,
        template: {
          format: "pdf",
          layout: "a4-landscape",
          layoutOptions: {
            titleText: feature.attributes.STATE_NAME
          }
        }
      }).then(res => {
        console.log(res.url);
        window.open(res.url,"_new");
      });

    } catch (error) {
      console.log("EsriLoader: ", error);
    }

  }

  ngOnInit() {

    // Initialize MapView and return an instance of MapView
    this.initializeMap().then(mapView => {

      // The map has been initialized
      console.log("mapView ready: ", this._view.ready);
      this._loaded = this._view.ready;
      this.mapLoadedEvent.emit(true);

      // Subscribe to center and polygon update
      this.geometryService.getGraphicsUpdateListener().subscribe(async (rings: Array<any>) => {
        this.setPolygonGraphic(rings);
      });

      // Subscribe to printing
      this.apiService.getPrintingListener().subscribe(async (feature: any) => {
        console.log("Printing...",feature);
        this.print(feature);
      });

    });
  }

  ngOnDestroy() {
    if (this._view) {
      // destroy the map view
      this._view.container = null;
    }
  }
}
