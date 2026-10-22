const express = require('express');
const { requireAuth, requireModerator } = require('../middlewares/auth');
const auth = require('../controllers/authController');
const disciplines = require('../controllers/disciplineController');
const materials = require('../controllers/materialController');
const reviews = require('../controllers/reviewController');
const questions = require('../controllers/questionController');
const reports = require('../controllers/reportController');
const users = require('../controllers/userController');
const notifications = require('../controllers/notificationController');

const router = express.Router();

// Autenticação
router.post('/auth/register', auth.register);
router.post('/auth/confirm', auth.confirmEmail);
router.post('/auth/resend', auth.resendConfirmation);
router.post('/auth/login', auth.login);
router.post('/auth/logout', requireAuth, auth.logout);
router.get('/auth/me', requireAuth, auth.me);

// Dados gerais e busca
router.get('/meta', disciplines.getMeta);
router.get('/search', disciplines.search);
router.get('/activity', disciplines.recentActivity);

// Disciplinas
router.get('/disciplines', disciplines.listDisciplines);
router.get('/disciplines/:code', disciplines.getDiscipline);
router.get('/disciplines/:code/materials', materials.listMaterials);
router.post('/disciplines/:code/materials', requireAuth, materials.createMaterial);
router.get('/disciplines/:code/reviews', reviews.listReviews);
router.put('/disciplines/:code/reviews', requireAuth, reviews.upsertReview);
router.get('/disciplines/:code/questions', questions.listQuestions);
router.post('/disciplines/:code/questions', requireAuth, questions.createQuestion);

// Materiais
router.get('/materials/:id/download', materials.downloadMaterial);
router.get('/materials/:id/view', materials.viewMaterial);
router.post('/materials/:id/vote', requireAuth, materials.voteMaterial);
router.delete('/materials/:id', requireAuth, materials.deleteMaterial);

// Avaliações
router.delete('/reviews/:id', requireAuth, reviews.deleteReview);

// Perguntas e respostas
router.get('/questions/:id', questions.getQuestion);
router.delete('/questions/:id', requireAuth, questions.deleteQuestion);
router.post('/questions/:id/answers', requireAuth, questions.createAnswer);
router.post('/questions/:id/best', requireAuth, questions.markBestAnswer);
router.post('/answers/:id/vote', requireAuth, questions.voteAnswer);
router.delete('/answers/:id', requireAuth, questions.deleteAnswer);

// Denúncias e moderação
router.post('/reports', requireAuth, reports.createReport);
router.get('/moderation/reports', requireModerator, reports.listReports);
router.post('/moderation/reports/:id/decision', requireModerator, reports.decideReport);

// Usuários e notificações
router.get('/users/me', requireAuth, users.getMe);
router.patch('/users/me', requireAuth, users.updateMe);
router.get('/users/:id', users.getUser);
router.get('/notifications', requireAuth, notifications.listNotifications);
router.post('/notifications/read', requireAuth, notifications.markRead);

module.exports = router;
