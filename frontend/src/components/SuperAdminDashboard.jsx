import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { incidentStatuses, urgencyLevels, incidentTypes, locations } from '../mockData';
import { apiRequest, API_CONFIG } from '../config';
import websocketManager from '../utils/websocket';
import SuperAdminLayout from './SuperAdminLayout';

function SuperAdminDashboard({ currentAdmin, onLogout }) {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [adminsWorkload, setAdminsWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [incidentToAssign, setIncidentToAssign] = useState(null);

  // Cargar incidentes, admins y conectar WebSocket
  useEffect(() => {
    loadIncidents();
    loadAdminsWorkload();

    // Solicitar permisos de notificación
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Conectar WebSocket
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (user && user.id && user.role) {
      console.log('🔌 SuperAdmin conectando WebSocket:', user.id, 'role:', user.role);
      websocketManager.connect(user.id, user.role);

      // Escuchar nuevos incidentes
      const unsubscribeNewIncident = websocketManager.on('NEW_INCIDENT', (data) => {
        console.log('🆕 Nuevo incidente recibido:', data);
        setIncidents(prevIncidents => [data.incident, ...prevIncidents]);
        toast.success(`Nuevo incidente: ${data.incident.trackingCode}`, {
          icon: '🚨',
        });
        showNotification('Nuevo incidente', data.message);
        // Recargar cargas de trabajo
        loadAdminsWorkload();
      });

      // Escuchar asignaciones
      const unsubscribeAssigned = websocketManager.on('INCIDENT_ASSIGNED', (data) => {
        console.log('👤 Incidente asignado:', data);
        setIncidents(prevIncidents =>
          prevIncidents.map(inc =>
            inc.id === data.incident.id ? data.incident : inc
          )
        );
        toast.info(`${data.incident.trackingCode} asignado`, {
          icon: '👤',
        });
        showNotification('Incidente asignado', data.message);
        // Recargar cargas de trabajo
        loadAdminsWorkload();
      });

      // Escuchar cambios de estado
      const unsubscribeStatus = websocketManager.on('INCIDENT_STATUS_UPDATED', (data) => {
        console.log('📝 Estado actualizado:', data);
        setIncidents(prevIncidents =>
          prevIncidents.map(inc =>
            inc.id === data.incident.id ? data.incident : inc
          )
        );
        toast.success(`${data.incident.trackingCode} - ${data.incident.status}`, {
          icon: '✅',
        });
        // Recargar cargas de trabajo
        loadAdminsWorkload();
      });

      // Cleanup al desmontar
      return () => {
        unsubscribeNewIncident();
        unsubscribeAssigned();
        unsubscribeStatus();
        websocketManager.disconnect();
      };
    }
  }, []);

  const showNotification = (title, message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
    console.log(`📢 ${title}: ${message}`);
  };

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_CONFIG.ENDPOINTS.INCIDENTS, {
        method: 'GET'
      }, true);
      setIncidents(response.incidents || []);
      setError('');
    } catch (err) {
      setError('Error al cargar incidentes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminsWorkload = async () => {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.INCIDENTS}/admins-workload`, {
        method: 'GET'
      }, true);
      setAdminsWorkload(response.admins || []);
      console.log('📊 Cargas de trabajo:', response.admins);
    } catch (err) {
      console.error('Error al cargar cargas de trabajo:', err);
    }
  };

  const handleAssignClick = (incident) => {
    setIncidentToAssign(incident);
    setShowAssignModal(true);
  };

  const handleAssignToAdmin = async (adminId, adminName) => {
    if (!incidentToAssign) return;

    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.INCIDENTS}/${incidentToAssign.id}/assign`,
        {
          method: 'PUT',
          body: JSON.stringify({
            assignToAdminId: adminId,
            assignedToName: adminName
          })
        },
        true
      );

      toast.success(`Incidente asignado a ${adminName}`, {
        icon: '✅',
      });

      // Actualizar la lista local
      setIncidents(prevIncidents =>
        prevIncidents.map(inc =>
          inc.id === incidentToAssign.id ? response.incident : inc
        )
      );

      // Recargar cargas de trabajo
      loadAdminsWorkload();

      // Cerrar modal
      setShowAssignModal(false);
      setIncidentToAssign(null);
    } catch (err) {
      toast.error('Error al asignar incidente', {
        icon: '❌',
      });
      console.error(err);
    }
  };

  const handleViewDetails = (incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedIncident(null);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setIncidentToAssign(null);
  };

  // Filtrado de incidentes
  const filteredIncidents = incidents.filter(incident => {
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesUrgency = filterUrgency === 'all' || incident.urgency === filterUrgency;
    const matchesSearch = !searchTerm || 
      incident.trackingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesUrgency && matchesSearch;
  });

  const getStatusData = (status) => {
    const statusMap = {
      'pendiente': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      'en-proceso': { label: 'En Proceso', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
      'resuelto': { label: 'Resuelto', color: 'bg-green-100 text-green-800', icon: '🟢' },
      'cerrado': { label: 'Cerrado', color: 'bg-gray-100 text-gray-800', icon: '⚪' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: '⚪' };
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'baja': 'bg-green-100 text-green-800',
      'media': 'bg-yellow-100 text-yellow-800',
      'alta': 'bg-red-100 text-red-800'
    };
    return colors[urgency] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SuperAdminLayout currentAdmin={currentAdmin} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Panel SuperAdministrador</h2>
            <button
              onClick={loadIncidents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Código, descripción o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                {incidentStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgencia
              </label>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas</option>
                {urgencyLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de incidentes */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando incidentes...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron incidentes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Urgencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No se encontraron incidentes con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                  filteredIncidents.map(incident => {
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
                        {incident.assignedToName || incident.assignedTo === 'unassigned' ? (
                          incident.assignedToName ? (
                            <span className="text-gray-900 font-medium">{incident.assignedToName}</span>
                          ) : (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )
                        ) : (
                          <span className="text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleViewDetails(incident)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver
                        </button>
                        {(incident.status === 'pendiente' || incident.status === 'en-proceso') && (
                          <button
                            onClick={() => handleAssignClick(incident)}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors"
                          >
                            Asignar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles */}      {/* Modal de detalles */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Detalles del Incidente
              </h3>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="font-semibold">Código de seguimiento:</span>
                <p className="text-lg text-blue-600">{selectedIncident.trackingCode}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Tipo:</span>
                  <p>{selectedIncident.type}</p>
                </div>
                <div>
                  <span className="font-semibold">Ubicación:</span>
                  <p>{selectedIncident.location}</p>
                </div>
                <div>
                  <span className="font-semibold">Estado:</span>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedIncident.status)}`}>
                      {selectedIncident.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="font-semibold">Urgencia:</span>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs ${getUrgencyColor(selectedIncident.urgency)}`}>
                      {selectedIncident.urgency}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <span className="font-semibold">Descripción:</span>
                <p className="mt-1 p-3 bg-gray-50 rounded">{selectedIncident.description}</p>
              </div>

              <div>
                <span className="font-semibold">Creado por:</span>
                <p>{selectedIncident.createdByName || 'N/A'} ({selectedIncident.createdByEmail || 'N/A'})</p>
              </div>

              <div>
                <span className="font-semibold">Asignado a:</span>
                <p>{selectedIncident.assignedToName || 'Sin asignar'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Fecha de creación:</span>
                  <p>{formatDate(selectedIncident.createdAt)}</p>
                </div>
                <div>
                  <span className="font-semibold">Última actualización:</span>
                  <p>{formatDate(selectedIncident.updatedAt)}</p>
                </div>
              </div>

              {selectedIncident.history && selectedIncident.history.length > 0 && (
                <div>
                  <span className="font-semibold">Historial:</span>
                  <div className="mt-2 space-y-2">
                    {selectedIncident.history.map((entry, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        <p><strong>{entry.action}</strong></p>
                        <p className="text-gray-600">Por: {entry.user}</p>
                        <p className="text-gray-500 text-xs">{formatDate(entry.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de asignación */}
      {showAssignModal && incidentToAssign && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Asignar Incidente: {incidentToAssign.trackingCode}
              </h3>
              <button
                onClick={closeAssignModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-gray-700">
                <strong>Descripción:</strong> {incidentToAssign.description}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Ubicación:</strong> {incidentToAssign.location} | <strong>Urgencia:</strong> {incidentToAssign.urgency}
              </p>
            </div>

            <h4 className="font-semibold mb-3 text-gray-700">
              Selecciona un administrador (ordenados por menor carga):
            </h4>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {adminsWorkload.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay administradores disponibles</p>
              ) : (
                adminsWorkload.map(admin => (
                  <div
                    key={admin.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => handleAssignToAdmin(admin.id, admin.name)}
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{admin.name}</p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        admin.activeCount === 0 ? 'bg-green-100 text-green-800' :
                        admin.activeCount <= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {admin.activeCount} activos
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeAssignModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}

export default SuperAdminDashboard;
