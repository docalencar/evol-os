export type GlobalConceptVersion = Readonly<{ id:string; conceptId:string; versionNumber:number; name:string; definition:string; category:string; status:"published" }>
export type TenantCompetencyMapping = Readonly<{ id:string; companyId:string; conceptVersionId:string; competencyId:string; status:"proposed"|"confirmed"|"rejected"|"inactive"; updatedAt:string }>
export type MappingOperation = "propose"|"confirm"|"reject"|"deactivate"
export type GlobalCatalogOperation = "create_concept"|"create_version"|"add_alias"|"publish_version"|"deprecate_version"
