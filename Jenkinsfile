pipeline {
    agent any
    stages {
        stage('Récupération Git') {
            steps {
                checkout scm
            }
        }
        stage('Déploiement Docker Compose') {
            steps {
                sh 'docker compose up -d --build'
            }
        }
        stage('Vérification') {
            steps {
                sh 'docker ps'
            }
        }
    }
}
