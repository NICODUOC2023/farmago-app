-- Elimina todos los tratamientos, recetas e historial de busquedas existentes.
-- Operacion solicitada para pasar a almacenamiento por usuario.
delete from public.treatment_intakes;
delete from public.treatment_schedules;
delete from public.treatment_medications;
delete from public.treatments;
delete from public.prescription_items;
delete from public.prescriptions;
delete from public.recent_searches;
