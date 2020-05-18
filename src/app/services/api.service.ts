import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private printing = new Subject<Object>();

  constructor(private httpClient: HttpClient){}

  public getDemographics(){
    return this.httpClient.get("https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Census_USA/MapServer/5/query",{
      params: {
        text: "",
        geometry: "",
        geometryType: "esriGeometryPoint",
        inSR: "",
        spatialRel: "esriSpatialRelIntersects",
        relationParam: "",
        objectIds: "",
        where: "POP2007>0",
        time: "",
        returnCountOnly: "false",
        returnIdsOnly: "false",
        returnGeometry: "true",
        maxAllowableOffset: "",
        outSR: "",
        outFields: "STATE_NAME,STATE_ABBR,SUB_REGION",
        f: "json"
      },
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  getPrintingListener(){
    return this.printing.asObservable();
  }

  print(feature: Object){
    this.printing.next(feature);
  }

}
