"use client";

import { useState, useEffect } from "react";

export interface ProfileApiData {
  name: string;
  email: string;
  image: string | null;
  birthDate: string | null;
  commercialName: string;
  legalName: string;
  rfc: string;
  address: string;
  contacts: { id?: string; type: "phone" | "email"; value: string; label: string | null; position: string | null; personName: string | null }[];
  /** Usuario que un proveedor dio de alta: la empresa es la de su principal. */
  isCarrierMember: boolean;
  /** Si puede cambiar los datos de la empresa. Falso para quien no tiene permiso. */
  companyEditable: boolean;
}

export function useProfile() {
  const [data, setData] = useState<ProfileApiData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "Inicia sesión para ver tu perfil."
              : "Error al cargar el perfil."
          );
        }
        const json = await res.json();
        if (!cancelled) {
          setData({
            name: json.name ?? "",
            email: json.email ?? "",
            image: json.image ?? null,
            birthDate: json.birthDate ?? null,
            commercialName: json.commercialName ?? "",
            legalName: json.legalName ?? "",
            rfc: json.rfc ?? "",
            address: json.address ?? "",
            isCarrierMember: Boolean(json.isCarrierMember),
            // Por defecto editable: así se comportan todos los que no son
            // usuarios agregados de un proveedor.
            companyEditable: json.companyEditable !== false,
            contacts: (json.contacts ?? []).map(
              (c: { id?: string; type: "phone" | "email"; value: string; label?: string | null; position?: string | null; personName?: string | null }) => ({
                id: c.id,
                type: c.type,
                value: c.value,
                label: c.label ?? "",
                position: c.position ?? "",
                personName: c.personName ?? "",
              })
            ),
          });
        }
      } catch (e) {
        if (!cancelled)
          setFetchError(e instanceof Error ? e.message : "Error al cargar el perfil.");
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { data, isFetching, fetchError };
}
