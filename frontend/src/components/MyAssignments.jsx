import React, { useState } from 'react';
import { mockIncidents, incidentStatuses, urgencyLevels } from '../mockData';
import AdminLayout from './AdminLayout';

function MyAssignments({ currentAdmin, onLogout }) {
  // Filtrar solo los incidentes asignados a este admin que no estén resueltos ni cerrados
  const myActiveIncidents = mockIncidents.filter(
    incident => incident.assignedTo === currentAdmin.name && 
    (incident.status === 'pendiente' || incident.status === 'en-proceso')
  );
  
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [incidents, setIncidents] = useState(mockIncidents);

  // Estadísticas
  const stats = {
    total: myActiveIncidents.length,
    pendientes: myActiveIncidents.filter(i => i.status === 'pendiente').length,
    enProceso: myActiveIncidents.filter(i => i.status === 'en-proceso').length
  };

  // Cambiar estado del incidente
  const handleChangeStatus = (incidentId, newStatus) => {
    setIncidents(incidents.map(incident => {
      if (incident.id === incidentId) {
        const statusLabel = incidentStatuses.find(s => s.value === newStatus)?.label;
        return {
          ...incident,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          history: [
            ...incident.history,
            {
              action: `Estado cambiado a ${statusLabel}`,
              timestamp: new Date().toISOString(),
              user: currentAdmin.name
            }
          ]
        };
      }
      return incident;
    }));
  };

  // Abrir modal de detalles
  const openDetailModal = (incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  // Cerrar modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedIncident(null);
  };

  // Obtener clase de color para urgencia
  const getUrgencyColor = (urgency) => {
    return urgencyLevels.find(u => u.value === urgency)?.color || 'text-gray-600 bg-gray-100';
  };

  // Obtener datos de estado
  const getStatusData = (status) => {
    return incidentStatuses.find(s => s.value === status);
  };

  return (
    <AdminLayout currentAdmin={currentAdmin} onLogout={onLogout}>
      <div className="container mx-auto px-4 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600 mb-1">Mis Asignaciones Activas</p>
            <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-1">Pendientes de Iniciar</p>
            <p className="text-3xl font-bold text-red-600">{stats.pendientes}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 mb-1">En Proceso</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.enProceso}</p>
          </div>
        </div>

        {/* Información */}
        {myActiveIncidents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No tienes incidentes asignados</h3>
            <p className="text-gray-600 mb-6">
              Actualmente no tienes incidentes pendientes o en proceso. Cuando te asignes un incidente, aparecerá aquí.
            </p>
          </div>
        ) : (
          <>
            {/* Información de cabecera */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Incidentes Bajo tu Responsabilidad</h3>
                  <p className="text-sm text-gray-600">
                    Aquí se muestran todos los incidentes que te has comprometido a resolver. Una vez que los marques como "Resuelto" o "Cerrado", aparecerán en la pestaña "Mis Resueltos".
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Incidentes */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Mis Incidentes Activos</h2>
                <p className="text-sm text-gray-600">Incidentes asignados pendientes o en proceso</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reportado por</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myActiveIncidents.map((incident) => {
                      const statusData = getStatusData(incident.status);
                      return (
                        <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {incident.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {incident.type}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {incident.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(incident.urgency)}`}>
                              {urgencyLevels.find(u => u.value === incident.urgency)?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusData?.color}`}>
                              {statusData?.icon} {statusData?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {incident.createdByName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => openDetailModal(incident)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Ver Detalles
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalles */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-utec-blue text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Detalle del Incidente</h3>
                  <p className="text-blue-200">ID: {selectedIncident.id}</p>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Tipo</label>
                  <p className="text-gray-900">{selectedIncident.type}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Ubicación</label>
                  <p className="text-gray-900">{selectedIncident.location}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Urgencia</label>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(selectedIncident.urgency)}`}>
                    {urgencyLevels.find(u => u.value === selectedIncident.urgency)?.label}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Estado Actual</label>
                  <div>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusData(selectedIncident.status)?.color}`}>
                      {getStatusData(selectedIncident.status)?.icon} {getStatusData(selectedIncident.status)?.label}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Reportado por</label>
                  <p className="text-gray-900">{selectedIncident.createdByName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Fecha de Reporte</label>
                  <p className="text-gray-900">{new Date(selectedIncident.createdAt).toLocaleString('es-PE')}</p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-semibold text-gray-600">Descripción</label>
                <p className="text-gray-900 mt-2 p-4 bg-gray-50 rounded-lg">{selectedIncident.description}</p>
              </div>

              {/* Acciones */}
              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-600 mb-3 block">Cambiar Estado</label>
                <div className="flex flex-wrap gap-2">
                  {incidentStatuses.map(status => (
                    <button
                      key={status.value}
                      onClick={() => {
                        handleChangeStatus(selectedIncident.id, status.value);
                        closeDetailModal();
                      }}
                      disabled={selectedIncident.status === status.value}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedIncident.status === status.value
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : status.color + ' hover:opacity-80'
                      }`}
                    >
                      {status.icon} {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Historial */}
              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-600 mb-3 block">Historial de Cambios</label>
                <div className="space-y-3">
                  {selectedIncident.history.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">{entry.action}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleString('es-PE')} - {entry.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="bg-gray-50 p-6 rounded-b-xl flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default MyAssignments;